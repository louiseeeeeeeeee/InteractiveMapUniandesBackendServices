import {
  Body,
  Controller,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ImportBuildingsDto } from '../places/dto/import-buildings.dto';
import { ImportGraphDto } from '../routes/dto/import-graph.dto';
import { SeedCampusDataDto } from './dto/seed-campus-data.dto';
import { SetupGuard } from './setup.guard';
import { SetupService } from './setup.service';

@ApiTags('setup')
@ApiHeader({
  name: 'x-setup-key',
  required: false,
  description:
    'Required only when SETUP_API_KEY is configured. If ENABLE_SETUP_ENDPOINTS=true in local development, this header can be omitted.',
})
@UseGuards(SetupGuard)
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Post('campus/seed/default')
  @ApiOperation({
    summary:
      'Seed the shared campus dataset from the bundled Excel files in src/utils',
  })
  seedDefaultCampusData(@Body() dto: SeedCampusDataDto) {
    return this.setupService.seedDefaultCampusData(dto);
  }

  @Post('campus/buildings/import')
  @ApiOperation({
    summary: 'Import the shared campus buildings from an Excel path on disk',
  })
  importBuildings(@Body() dto: ImportBuildingsDto) {
    return this.setupService.importBuildings(dto);
  }

  @Post('campus/buildings/import/file')
  @ApiOperation({
    summary: 'Import the shared campus buildings from an uploaded Excel file',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        replaceExisting: { type: 'boolean' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  importBuildingsFromFile(
    @UploadedFile() file: { buffer?: Buffer } | undefined,
    @Body() dto: ImportBuildingsDto,
  ) {
    return this.setupService.importBuildings(dto, file?.buffer);
  }

  @Post('campus/graph/import')
  @ApiOperation({
    summary: 'Import the shared campus graph from an Excel path on disk',
  })
  importCampusGraph(@Body() dto: ImportGraphDto) {
    return this.setupService.importCampusGraph(dto);
  }

  @Post('campus/graph/import/file')
  @ApiOperation({
    summary: 'Import the shared campus graph from an uploaded Excel file',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        replaceExisting: { type: 'boolean' },
        bidirectional: { type: 'boolean' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  importCampusGraphFromFile(
    @UploadedFile() file: { buffer?: Buffer } | undefined,
    @Body() dto: ImportGraphDto,
  ) {
    return this.setupService.importCampusGraph(dto, file?.buffer);
  }

  @Put('campus/graph/backfill-coords')
  @ApiOperation({
    summary:
      'Assign approximate lat/lng to every route node based on its building grid reference',
  })
  backfillNodeCoords() {
    return this.setupService.backfillNodeCoords();
  }
}
