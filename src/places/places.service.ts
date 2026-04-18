import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { read, readFile, utils } from 'xlsx';
import { Repository } from 'typeorm';
import { Building } from './entities/building.entity';
import { ImportBuildingsDto } from './dto/import-buildings.dto';
import { ListBuildingsDto } from './dto/list-buildings.dto';

interface BuildingRow {
  Codigo?: string;
  Edificio?: string;
  Ubicacion?: string;
}

@Injectable()
export class PlacesService {
  constructor(
    @InjectRepository(Building)
    private readonly buildingRepository: Repository<Building>,
  ) {}

  async listBuildings(query: ListBuildingsDto) {
    const buildings = await this.buildingRepository.find({
      order: {
        code: 'ASC',
      },
    });

    const searchTerm = query.search?.trim();

    if (!searchTerm) {
      return buildings;
    }

    const normalizedSearch = this.normalizeText(searchTerm);

    return buildings.filter((building) => {
      const fields = [
        building.code,
        building.name,
        building.gridReference ?? '',
        ...(building.aliases ?? []),
      ];

      return fields.some((field) =>
        this.normalizeText(field).includes(normalizedSearch),
      );
    });
  }

  async getBuildingById(id: string) {
    const building = await this.buildingRepository.findOne({
      where: { id },
      relations: {
        rooms: true,
      },
    });

    if (!building) {
      throw new NotFoundException(`Building with id "${id}" was not found.`);
    }

    return building;
  }

  async importBuildings(dto: ImportBuildingsDto, fileBuffer?: Buffer) {
    const rows = this.readBuildingRows(dto.filePath, fileBuffer);

    if (!rows.length) {
      throw new BadRequestException(
        'The provided workbook does not contain building rows.',
      );
    }

    if (this.parseBoolean(dto.replaceExisting)) {
      const existingBuildings = await this.buildingRepository.find();
      if (existingBuildings.length > 0) {
        await this.buildingRepository.remove(existingBuildings);
      }
    }

    const savedBuildings: Building[] = [];

    for (const row of rows) {
      const rawCode = row.Codigo?.toString().trim();
      const rawName = row.Edificio?.toString().trim();

      if (!rawCode || !rawName) {
        continue;
      }

      const normalizedAliases = this.extractAliases(rawCode);
      const gridReference = this.normalizeGridReference(row.Ubicacion);

      const existingBuilding = await this.findBuildingByCode(rawCode);
      const building =
        existingBuilding ?? this.buildingRepository.create({ code: rawCode });

      building.name = rawName;
      building.aliases = normalizedAliases;
      building.gridReference = gridReference;
      building.latitude = existingBuilding?.latitude ?? null;
      building.longitude = existingBuilding?.longitude ?? null;

      savedBuildings.push(await this.buildingRepository.save(building));
    }

    return {
      importedCount: savedBuildings.length,
      buildings: savedBuildings,
    };
  }

  private readBuildingRows(filePath?: string, fileBuffer?: Buffer) {
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

    const worksheet = workbook.Sheets[firstSheetName];

    return utils.sheet_to_json<BuildingRow>(worksheet, {
      defval: '',
      raw: false,
    });
  }

  private async findBuildingByCode(code: string) {
    const normalizedCode = this.normalizeText(code);
    const buildings = await this.buildingRepository.find();

    return buildings.find((building) => {
      const aliases = [building.code, ...(building.aliases ?? [])];
      return aliases.some(
        (alias) => this.normalizeText(alias) === normalizedCode,
      );
    });
  }

  private extractAliases(rawCode: string) {
    const aliases = rawCode
      .split('/')
      .map((value) => value.trim())
      .filter(Boolean);

    return [...new Set([rawCode.trim(), ...aliases])];
  }

  private normalizeGridReference(value?: string) {
    const trimmed = value?.toString().trim();

    if (!trimmed || trimmed === '-') {
      return null;
    }

    return trimmed;
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
