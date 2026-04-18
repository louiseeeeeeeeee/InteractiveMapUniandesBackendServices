import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { read, readFile, utils } from 'xlsx';
import { Repository } from 'typeorm';
import { TravelMode } from '../common/enums/travel-mode.enum';
import { Building } from '../places/entities/building.entity';
import { CalculatePathDto } from './dto/calculate-path.dto';
import { ImportGraphDto } from './dto/import-graph.dto';
import { Edge } from './entities/edge.entity';
import { RouteNode } from './entities/route-node.entity';

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
  ) {}

  async importCampusGraph(dto: ImportGraphDto, fileBuffer?: Buffer) {
    const rows = this.readGraphRows(dto.filePath, fileBuffer);

    if (!rows.length) {
      throw new BadRequestException(
        'The provided workbook does not contain graph rows.',
      );
    }

    const bidirectional = dto.bidirectional === undefined
      ? true
      : this.parseBoolean(dto.bidirectional);

    if (this.parseBoolean(dto.replaceExisting)) {
      await this.clearCampusGraph();
    }

    const buildings = await this.buildingRepository.find();
    const nodeCache = new Map<string, RouteNode>();
    const existingNodes = await this.routeNodeRepository.find({
      where: { isCampusGraphNode: true },
      relations: { place: true },
    });

    for (const node of existingNodes) {
      nodeCache.set(this.normalizeText(node.label), node);
    }

    const edgesToPersist: Edge[] = [];
    const edgeKeySet = new Set<string>();

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
      );
      const toNode = await this.getOrCreateCampusNode(toLabel, nodeCache, buildings);

      this.pushCampusEdge(
        edgesToPersist,
        edgeKeySet,
        fromNode,
        toNode,
        travelTimeSeconds,
      );

      if (bidirectional) {
        this.pushCampusEdge(
          edgesToPersist,
          edgeKeySet,
          toNode,
          fromNode,
          travelTimeSeconds,
        );
      }
    }

    if (edgesToPersist.length > 0) {
      await this.edgeRepository.save(edgesToPersist);
    }

    return {
      importedNodeCount: nodeCache.size,
      importedEdgeCount: edgesToPersist.length,
      bidirectional,
    };
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
    if (!query.from?.trim() || !query.to?.trim()) {
      throw new BadRequestException('Both "from" and "to" are required.');
    }

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

    const startNode = this.resolveNodeQuery(query.from, nodes, buildings);
    const endNode = this.resolveNodeQuery(query.to, nodes, buildings);

    if (!startNode) {
      throw new NotFoundException(`Could not resolve origin "${query.from}".`);
    }

    if (!endNode) {
      throw new NotFoundException(`Could not resolve destination "${query.to}".`);
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

    return {
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
  }

  private readGraphRows(filePath?: string, fileBuffer?: Buffer) {
    const workbook = fileBuffer?.length
      ? read(fileBuffer, { type: 'buffer' })
      : filePath
        ? readFile(filePath)
        : null;

    if (!workbook) {
      throw new BadRequestException(
        'Provide a valid filePath or upload an Excel file.',
      );
    }

    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return [];
    }

    return utils.sheet_to_json<GraphRow>(workbook.Sheets[firstSheetName], {
      defval: '',
      raw: false,
    });
  }

  private async clearCampusGraph() {
    const existingEdges = await this.edgeRepository.find({
      where: { isCampusGraphEdge: true },
    });
    if (existingEdges.length > 0) {
      await this.edgeRepository.remove(existingEdges);
    }

    const existingNodes = await this.routeNodeRepository.find({
      where: { isCampusGraphNode: true },
    });
    if (existingNodes.length > 0) {
      await this.routeNodeRepository.remove(existingNodes);
    }
  }

  private async getOrCreateCampusNode(
    label: string,
    nodeCache: Map<string, RouteNode>,
    buildings: Building[],
  ) {
    const normalizedLabel = this.normalizeText(label);
    const cachedNode = nodeCache.get(normalizedLabel);

    if (cachedNode) {
      return cachedNode;
    }

    const node = this.routeNodeRepository.create({
      label: label.trim(),
      latitude: null,
      longitude: null,
      isCampusGraphNode: true,
      place: this.resolveBuildingForNodeLabel(label, buildings) ?? null,
    });

    const savedNode = await this.routeNodeRepository.save(node);
    nodeCache.set(normalizedLabel, savedNode);

    return savedNode;
  }

  private pushCampusEdge(
    edgesToPersist: Edge[],
    edgeKeySet: Set<string>,
    fromNode: RouteNode,
    toNode: RouteNode,
    travelTimeSeconds: number,
  ) {
    const key = `${fromNode.id}->${toNode.id}`;

    if (edgeKeySet.has(key)) {
      return;
    }

    edgeKeySet.add(key);
    edgesToPersist.push(
      this.edgeRepository.create({
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
    return value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }
}
