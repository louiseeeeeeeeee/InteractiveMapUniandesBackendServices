import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { ImportBuildingsDto } from '../places/dto/import-buildings.dto';
import { PlacesService } from '../places/places.service';
import { ImportGraphDto } from '../routes/dto/import-graph.dto';
import { RouteNode } from '../routes/entities/route-node.entity';
import { RoutesService } from '../routes/routes.service';
import { SeedCampusDataDto } from './dto/seed-campus-data.dto';
import {
  centerFallback,
  gridToLatLng,
  jitterAround,
  parseGridReference,
} from './node-coords.util';

@Injectable()
export class SetupService {
  constructor(
    private readonly placesService: PlacesService,
    private readonly routesService: RoutesService,
    @InjectRepository(RouteNode)
    private readonly routeNodeRepository: Repository<RouteNode>,
  ) {}

  async seedDefaultCampusData(dto: SeedCampusDataDto) {
    const buildingsFilePath =
      dto.buildingsFilePath?.trim() ||
      this.resolveBundledFilePath('edificios_y_casas.xlsx');
    const graphFilePath =
      dto.graphFilePath?.trim() || this.resolveBundledFilePath('move.xlsx');

    const [buildingsResult, graphResult] = await Promise.all([
      this.placesService.importBuildings({
        filePath: buildingsFilePath,
        replaceExisting: dto.replaceExisting ?? true,
      }),
      this.routesService.importCampusGraph({
        filePath: graphFilePath,
        replaceExisting: dto.replaceExisting ?? true,
        bidirectional: dto.bidirectional ?? true,
      }),
    ]);

    return {
      files: {
        buildingsFilePath,
        graphFilePath,
      },
      buildings: buildingsResult,
      graph: graphResult,
    };
  }

  async importBuildings(dto: ImportBuildingsDto, fileBuffer?: Buffer) {
    return this.placesService.importBuildings(dto, fileBuffer);
  }

  async importCampusGraph(dto: ImportGraphDto, fileBuffer?: Buffer) {
    return this.routesService.importCampusGraph(dto, fileBuffer);
  }

  async backfillNodeCoords() {
    const nodes = await this.routeNodeRepository.find({
      where: { isCampusGraphNode: true },
      relations: { place: true }, // Need building grid to approximate
    });

    let updated = 0;
    for (const node of nodes) {
      const grid = parseGridReference(
        (node.place as any)?.gridReference ?? null,
      );
      const base = grid ? gridToLatLng(grid) : centerFallback(node.label);
      const jittered = grid
        ? jitterAround(node.label, base.lat, base.lng)
        : base; // Fallback already jittered
      node.latitude = Number(jittered.lat.toFixed(7));
      node.longitude = Number(jittered.lng.toFixed(7));
      updated += 1;
    }

    if (updated > 0) {
      await this.routeNodeRepository.save(nodes);
    }

    return { updatedNodeCount: updated, totalNodes: nodes.length };
  }

  private resolveBundledFilePath(fileName: string) {
    const candidatePaths = [
      join(process.cwd(), 'src', 'utils', fileName),
      join(process.cwd(), 'dist', 'utils', fileName),
      join(process.cwd(), 'utils', fileName),
    ];

    for (const candidatePath of candidatePaths) {
      if (existsSync(candidatePath)) {
        return candidatePath;
      }
    }

    throw new NotFoundException(
      `Bundled setup file "${fileName}" was not found in src/utils, dist/utils or utils.`,
    );
  }
}
