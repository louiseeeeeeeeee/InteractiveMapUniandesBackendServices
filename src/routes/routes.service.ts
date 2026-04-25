import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import { DataSource, Repository } from 'typeorm';
import { normalizeSearchText } from '../common/utils/building-matching.util';
import { resolveProjectImportPath } from '../common/utils/project-import-path.util';
import { TravelMode } from '../common/enums/travel-mode.enum';
import { Building } from '../places/entities/building.entity';
import { Place } from '../places/entities/place.entity';
import { ScheduledClass } from '../schedules/entities/scheduled-class.entity';
import { resolveScheduledClassDestination } from '../schedules/utils/class-destination.util';
import { CalculateClassPathDto } from './dto/calculate-class-path.dto';
import { CalculatePathDto } from './dto/calculate-path.dto';
import { ImportGraphDto } from './dto/import-graph.dto';
import { Edge } from './entities/edge.entity';
import { RouteNode } from './entities/route-node.entity';

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface GraphRow {
  from?: string;
  to?: string;
  time?: string | number;
}

interface GraphNodeMatch {
  node: RouteNode;
  score: number;
}

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(RouteNode)
    private readonly routeNodeRepository: Repository<RouteNode>,
    @InjectRepository(Edge)
    private readonly edgeRepository: Repository<Edge>,
    @InjectRepository(Building)
    private readonly buildingRepository: Repository<Building>,
    @InjectRepository(Place)
    private readonly placeRepository: Repository<Place>,
    @InjectRepository(ScheduledClass)
    private readonly scheduledClassRepository: Repository<ScheduledClass>,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async importCampusGraph(dto: ImportGraphDto, fileBuffer?: Buffer) {
    const rows = await this.readGraphRows(dto.filePath, fileBuffer);

    if (!rows.length) {
      throw new BadRequestException(
        'The provided workbook does not contain graph rows.',
      );
    }

    const bidirectional = dto.bidirectional === undefined
      ? true
      : this.parseBoolean(dto.bidirectional);
    const replaceExisting = this.parseBoolean(dto.replaceExisting);

    return this.dataSource.transaction(async (manager) => {
      const routeNodeRepository = manager.getRepository(RouteNode);
      const edgeRepository = manager.getRepository(Edge);
      const buildingRepository = manager.getRepository(Building);

      if (replaceExisting) {
        await this.clearCampusGraph(edgeRepository, routeNodeRepository);
      }

      const buildings = await buildingRepository.find();
      const nodeCache = new Map<string, RouteNode>();
      const existingNodes = await routeNodeRepository.find({
        where: { isCampusGraphNode: true },
        relations: { place: true },
      });

      for (const node of existingNodes) {
        nodeCache.set(this.normalizeText(node.label), node);
      }

      const edgesToPersist: Edge[] = [];
      const edgeKeySet = new Set<string>();
      const existingEdges = await edgeRepository.find({
        where: { isCampusGraphEdge: true },
        relations: {
          fromNode: true,
          toNode: true,
        },
      });

      for (const edge of existingEdges) {
        edgeKeySet.add(`${edge.fromNode.id}->${edge.toNode.id}`);
      }

      for (const row of rows) {
        const fromLabel = row.from?.toString().trim();
        const toLabel = row.to?.toString().trim();
        const travelTimeSeconds = Number(row.time);

        if (!fromLabel || !toLabel || Number.isNaN(travelTimeSeconds)) {
          continue;
        }

        const fromNode = await this.getOrCreateCampusNode(
          fromLabel,
          nodeCache,
          buildings,
          routeNodeRepository,
        );
        const toNode = await this.getOrCreateCampusNode(
          toLabel,
          nodeCache,
          buildings,
          routeNodeRepository,
        );

        this.pushCampusEdge(
          edgesToPersist,
          edgeKeySet,
          fromNode,
          toNode,
          travelTimeSeconds,
          edgeRepository,
        );

        if (bidirectional) {
          this.pushCampusEdge(
            edgesToPersist,
            edgeKeySet,
            toNode,
            fromNode,
            travelTimeSeconds,
            edgeRepository,
          );
        }
      }

      if (edgesToPersist.length > 0) {
        await edgeRepository.save(edgesToPersist);
      }

      return {
        importedNodeCount: nodeCache.size,
        importedEdgeCount: edgesToPersist.length,
        bidirectional,
      };
    });
  }

  async listCampusNodes() {
    return this.routeNodeRepository.find({
      where: { isCampusGraphNode: true },
      relations: {
        place: true,
      },
      order: {
        label: 'ASC',
      },
    });
  }

  async calculateShortestPath(query: CalculatePathDto) {
    return this.calculateShortestPathBetween(query.from, query.to);
  }

  async findNearestNode(lat: number, lng: number) { // Simple in-memory nearest search
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('lat and lng are required numbers.');
    }
    const nodes = await this.routeNodeRepository.find({
      where: { isCampusGraphNode: true },
    });
    let best: RouteNode | undefined;
    let bestDist = Infinity;
    for (const node of nodes) {
      if (node.latitude == null || node.longitude == null) continue;
      const d = haversineMeters(lat, lng, Number(node.latitude), Number(node.longitude));
      if (d < bestDist) {
        bestDist = d;
        best = node;
      }
    }
    if (!best) {
      throw new NotFoundException('No graph node has coordinates yet.');
    }
    return {
      node: {
        id: best.id,
        label: best.label,
        latitude: best.latitude,
        longitude: best.longitude,
      },
      distanceMeters: Math.round(bestDist),
    };
  }

  async calculatePathToClass(query: CalculateClassPathDto) {
    const scheduledClass = await this.resolveScheduledClass(query.classId);
    return this.buildClassPathResponse(query.from, scheduledClass);
  }

  async calculatePathToUserClass(userId: string, query: CalculateClassPathDto) {
    const scheduledClass = await this.resolveScheduledClass(query.classId, userId);
    return this.buildClassPathResponse(query.from, scheduledClass);
  }

  private async calculateShortestPathBetween(from: string, to: string) {
    if (!from?.trim() || !to?.trim()) {
      throw new BadRequestException('Both "from" and "to" are required.');
    }

    const cacheKey = `graph:path:${from.trim().toLowerCase()}->${to.trim().toLowerCase()}`; // Cache key per pair
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached; // Skip Dijkstra if same pair cached

    const [nodes, edges, buildings] = await Promise.all([
      this.routeNodeRepository.find({
        where: { isCampusGraphNode: true },
        relations: { place: true },
      }),
      this.edgeRepository.find({
        where: { isCampusGraphEdge: true },
        relations: {
          fromNode: true,
          toNode: true,
        },
      }),
      this.buildingRepository.find(),
    ]);

    let startNode: RouteNode | undefined = this.resolveNodeQuery(from, nodes, buildings);
    let endNode: RouteNode | undefined = this.resolveNodeQuery(to, nodes, buildings);

    if (!startNode) {
      startNode = await this.resolveNodeViaPlaceCoords(from, nodes); // Last resort: place name -> coords -> nearest node
    }
    if (!endNode) {
      endNode = await this.resolveNodeViaPlaceCoords(to, nodes);
    }

    if (!startNode) {
      throw new NotFoundException(`Could not resolve origin "${from}".`);
    }

    if (!endNode) {
      throw new NotFoundException(`Could not resolve destination "${to}".`);
    }

    if (startNode.id === endNode.id) {
      return {
        from: startNode.label,
        to: endNode.label,
        totalTimeSeconds: 0,
        totalTimeMinutes: 0,
        path: [this.mapNodeToResponse(startNode)],
        traversedEdges: [],
      };
    }

    const adjacency = new Map<
      string,
      Array<{ node: RouteNode; edge: Edge; weight: number }>
    >();

    for (const edge of edges) {
      const current = adjacency.get(edge.fromNode.id) ?? [];
      current.push({
        node: edge.toNode,
        edge,
        weight: edge.travelTimeSeconds,
      });
      adjacency.set(edge.fromNode.id, current);
    }

    const distances = new Map<string, number>();
    const previous = new Map<string, { nodeId: string; edge: Edge }>();
    const unvisited = new Set(nodes.map((node) => node.id));

    for (const node of nodes) {
      distances.set(node.id, Number.POSITIVE_INFINITY);
    }

    distances.set(startNode.id, 0);

    while (unvisited.size > 0) {
      const currentNodeId = this.getClosestUnvisitedNode(unvisited, distances);

      if (!currentNodeId) {
        break;
      }

      if (currentNodeId === endNode.id) {
        break;
      }

      unvisited.delete(currentNodeId);
      const neighbors = adjacency.get(currentNodeId) ?? [];

      for (const neighbor of neighbors) {
        if (!unvisited.has(neighbor.node.id)) {
          continue;
        }

        const currentDistance = distances.get(currentNodeId) ?? Number.POSITIVE_INFINITY;
        const candidateDistance = currentDistance + neighbor.weight;

        if (candidateDistance < (distances.get(neighbor.node.id) ?? Number.POSITIVE_INFINITY)) {
          distances.set(neighbor.node.id, candidateDistance);
          previous.set(neighbor.node.id, {
            nodeId: currentNodeId,
            edge: neighbor.edge,
          });
        }
      }
    }

    const totalTimeSeconds = distances.get(endNode.id);

    if (totalTimeSeconds === undefined || !Number.isFinite(totalTimeSeconds)) {
      throw new NotFoundException(
        `No path was found between "${startNode.label}" and "${endNode.label}".`,
      );
    }

    const pathNodeIds: string[] = [];
    const traversedEdges: Edge[] = [];
    let currentNodeId: string | undefined = endNode.id;

    while (currentNodeId) {
      pathNodeIds.push(currentNodeId);
      const previousEntry = previous.get(currentNodeId);

      if (!previousEntry) {
        break;
      }

      traversedEdges.push(previousEntry.edge);
      currentNodeId = previousEntry.nodeId;
    }

    pathNodeIds.reverse();
    traversedEdges.reverse();

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const path = pathNodeIds
      .map((nodeId) => nodeById.get(nodeId))
      .filter((node): node is RouteNode => Boolean(node))
      .map((node) => this.mapNodeToResponse(node));

    const result = {
      from: startNode.label,
      to: endNode.label,
      totalTimeSeconds,
      totalTimeMinutes: Number((totalTimeSeconds / 60).toFixed(2)),
      path,
      traversedEdges: traversedEdges.map((edge) => ({
        from: edge.fromNode.label,
        to: edge.toNode.label,
        travelTimeSeconds: edge.travelTimeSeconds,
      })),
    };
    await this.cache.set(cacheKey, result, 5 * 60 * 1000); // Cache path for 5min
    return result;
  }

  private async readGraphRows(filePath?: string, fileBuffer?: Buffer) {
    const workbook = new ExcelJS.Workbook();

    if (fileBuffer?.length) {
      await workbook.xlsx.read(Readable.from(fileBuffer));
    } else if (filePath) {
      await workbook.xlsx.readFile(
        resolveProjectImportPath(filePath, '.xlsx'),
      );
    } else {
      throw new BadRequestException(
        'Provide a valid filePath or upload an Excel file.',
      );
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return [];
    }

    const headerRow = worksheet.getRow(1);
    const headers = Array.from(
      { length: headerRow.cellCount },
      (_, index) => headerRow.getCell(index + 1).text.trim(),
    );

    const rows: GraphRow[] = [];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const mappedRow: Record<string, string> = {};
      let hasValues = false;

      headers.forEach((header, index) => {
        if (!header) {
          return;
        }

        const value = row.getCell(index + 1).text.trim();
        mappedRow[header] = value;

        if (value) {
          hasValues = true;
        }
      });

      if (hasValues) {
        rows.push(mappedRow as GraphRow);
      }
    }

    return rows;
  }

  private async clearCampusGraph(
    edgeRepository: Repository<Edge>,
    routeNodeRepository: Repository<RouteNode>,
  ) {
    const existingEdges = await edgeRepository.find({
      where: { isCampusGraphEdge: true },
    });
    if (existingEdges.length > 0) {
      await edgeRepository.remove(existingEdges);
    }

    const existingNodes = await routeNodeRepository.find({
      where: { isCampusGraphNode: true },
    });
    if (existingNodes.length > 0) {
      await routeNodeRepository.remove(existingNodes);
    }
  }

  private async getOrCreateCampusNode(
    label: string,
    nodeCache: Map<string, RouteNode>,
    buildings: Building[],
    routeNodeRepository: Repository<RouteNode>,
  ) {
    const normalizedLabel = this.normalizeText(label);
    const cachedNode = nodeCache.get(normalizedLabel);

    if (cachedNode) {
      return cachedNode;
    }

    const node = routeNodeRepository.create({
      label: label.trim(),
      latitude: null,
      longitude: null,
      isCampusGraphNode: true,
      place: this.resolveBuildingForNodeLabel(label, buildings) ?? null,
    });

    const savedNode = await routeNodeRepository.save(node);
    nodeCache.set(normalizedLabel, savedNode);

    return savedNode;
  }

  private pushCampusEdge(
    edgesToPersist: Edge[],
    edgeKeySet: Set<string>,
    fromNode: RouteNode,
    toNode: RouteNode,
    travelTimeSeconds: number,
    edgeRepository: Repository<Edge>,
  ) {
    const key = `${fromNode.id}->${toNode.id}`;

    if (edgeKeySet.has(key)) {
      return;
    }

    edgeKeySet.add(key);
    edgesToPersist.push(
      edgeRepository.create({
        fromNode,
        toNode,
        travelTimeSeconds,
        estimatedDurationMinutes: Number((travelTimeSeconds / 60).toFixed(2)),
        distanceMeters: null,
        travelMode: TravelMode.WALKING,
        isAccessible: false,
        isCampusGraphEdge: true,
      }),
    );
  }

  // Look up a place by exact name, code, or alias. If it has coords, snap to the nearest graph node.
  // Used as a fallback for restaurants and any non-building place the user can tap to navigate to.
  private async resolveNodeViaPlaceCoords(query: string, nodes: RouteNode[]) {
    const normalizedQuery = this.normalizeText(query);
    if (!normalizedQuery) return undefined;

    const allPlaces = await this.placeRepository.find();
    const place = allPlaces.find((p) => {
      if (this.normalizeText(p.name ?? '') === normalizedQuery) return true;
      const codeLike = (p as any).code as string | undefined;
      if (codeLike && this.normalizeText(codeLike) === normalizedQuery) return true;
      const aliases = ((p as any).aliases ?? []) as string[];
      return aliases.some((a) => this.normalizeText(a) === normalizedQuery);
    });

    if (!place || place.latitude == null || place.longitude == null) return undefined;

    let best: RouteNode | undefined;
    let bestDist = Infinity;
    for (const node of nodes) {
      if (node.latitude == null || node.longitude == null) continue;
      const d = haversineMeters(
        Number(place.latitude),
        Number(place.longitude),
        Number(node.latitude),
        Number(node.longitude),
      );
      if (d < bestDist) { bestDist = d; best = node; }
    }
    return best;
  }

  private resolveNodeQuery(
    query: string,
    nodes: RouteNode[],
    buildings: Building[],
  ) {
    const normalizedQuery = this.normalizeText(query);
    const exactLabelMatch = nodes.find(
      (node) => this.normalizeText(node.label) === normalizedQuery,
    );

    if (exactLabelMatch) {
      return exactLabelMatch;
    }

    const buildingMatch = buildings.find((building) => {
      const fields = [building.code, building.name, ...(building.aliases ?? [])];

      return fields.some(
        (field) => this.normalizeText(field) === normalizedQuery,
      );
    });

    if (buildingMatch) {
      const aliases = [buildingMatch.code, ...(buildingMatch.aliases ?? [])];
      const rankedCandidates = nodes
        .map((node) => ({
          node,
          score: this.scoreNodeAgainstAliases(node, aliases),
        }))
        .filter((candidate) => candidate.score > 0)
        .sort((a, b) => b.score - a.score);

      if (rankedCandidates.length > 0) {
        return rankedCandidates[0].node;
      }
    }

    const partialMatches = nodes
      .map((node) => ({
        node,
        score: this.scoreNodeAgainstQuery(node, normalizedQuery),
      }))
      .filter((candidate): candidate is GraphNodeMatch => candidate.score > 0)
      .sort((a, b) => b.score - a.score);

    return partialMatches[0]?.node;
  }

  private resolveBuildingForNodeLabel(label: string, buildings: Building[]) {
    const normalizedLabel = this.normalizeText(label);
    const rankedBuildings = buildings
      .map((building) => ({
        building,
        score: this.scoreBuildingAgainstNodeLabel(normalizedLabel, building),
      }))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score);

    return rankedBuildings[0]?.building;
  }

  private scoreNodeAgainstAliases(node: RouteNode, aliases: string[]) {
    const normalizedLabel = this.normalizeText(node.label);
    let bestScore = 0;

    for (const alias of aliases) {
      const normalizedAlias = this.normalizeText(alias);

      if (normalizedLabel === `${normalizedAlias} ENTRADA`) {
        bestScore = Math.max(bestScore, 100);
      } else if (normalizedLabel.startsWith(`${normalizedAlias} `)) {
        bestScore = Math.max(bestScore, 90);
      } else if (normalizedLabel === normalizedAlias) {
        bestScore = Math.max(bestScore, 80);
      } else if (normalizedLabel.includes(` ${normalizedAlias} `)) {
        bestScore = Math.max(bestScore, 60);
      } else if (normalizedLabel.endsWith(` ${normalizedAlias}`)) {
        bestScore = Math.max(bestScore, 55);
      }
    }

    return bestScore;
  }

  private scoreNodeAgainstQuery(node: RouteNode, normalizedQuery: string) {
    const normalizedLabel = this.normalizeText(node.label);

    if (normalizedLabel === normalizedQuery) {
      return 100;
    }

    if (normalizedLabel.startsWith(`${normalizedQuery} `)) {
      return 80;
    }

    if (normalizedLabel.includes(normalizedQuery)) {
      return 40;
    }

    return 0;
  }

  private scoreBuildingAgainstNodeLabel(
    normalizedLabel: string,
    building: Building,
  ) {
    const aliases = [building.code, ...(building.aliases ?? [])];
    let bestScore = 0;

    for (const alias of aliases) {
      const normalizedAlias = this.normalizeText(alias);

      if (normalizedLabel === `${normalizedAlias} ENTRADA`) {
        bestScore = Math.max(bestScore, 100);
      } else if (normalizedLabel.startsWith(`${normalizedAlias} `)) {
        bestScore = Math.max(bestScore, 90);
      } else if (normalizedLabel === normalizedAlias) {
        bestScore = Math.max(bestScore, 75);
      }
    }

    return bestScore;
  }

  private getClosestUnvisitedNode(
    unvisited: Set<string>,
    distances: Map<string, number>,
  ) {
    let closestNodeId: string | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const nodeId of unvisited) {
      const distance = distances.get(nodeId) ?? Number.POSITIVE_INFINITY;

      if (distance < closestDistance) {
        closestDistance = distance;
        closestNodeId = nodeId;
      }
    }

    return closestNodeId;
  }

  private mapNodeToResponse(node: RouteNode) {
    return {
      id: node.id,
      label: node.label,
      latitude: node.latitude,
      longitude: node.longitude,
      place: node.place
        ? {
            id: node.place.id,
            name: node.place.name,
          }
        : null,
    };
  }

  private parseBoolean(value?: boolean | string) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    return false;
  }

  private normalizeText(value: string) {
    return normalizeSearchText(value);
  }

  private async resolveScheduledClass(classId: string, userId?: string) {
    if (!classId?.trim()) {
      throw new BadRequestException('"classId" is required.');
    }

    const scheduledClass = await this.scheduledClassRepository.findOne({
      where: userId
        ? {
            id: classId,
            schedule: {
              user: {
                id: userId,
              },
            },
          }
        : { id: classId },
      relations: {
        schedule: true,
        room: {
          building: true,
        },
      },
    });

    if (!scheduledClass) {
      throw new NotFoundException(
        userId
          ? `Scheduled class "${classId}" was not found for the current user.`
          : `Scheduled class "${classId}" was not found.`,
      );
    }

    return scheduledClass;
  }

  private async buildClassPathResponse(from: string, scheduledClass: ScheduledClass) {
    const buildings = await this.buildingRepository.find();
    const destination = resolveScheduledClassDestination(scheduledClass, buildings);

    if (!destination.routeTarget) {
      throw new NotFoundException(
        `Could not resolve a navigable destination for class "${scheduledClass.title}".`,
      );
    }

    const path = await this.calculateShortestPathBetween(
      from,
      destination.routeTarget,
    );

    return {
      class: {
        id: scheduledClass.id,
        title: scheduledClass.title,
        startsAt: scheduledClass.startsAt,
        endsAt: scheduledClass.endsAt,
      },
      destination,
      path,
    };
  }
}
