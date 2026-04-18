import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ImportBuildingsDto } from './dto/import-buildings.dto';
import { ListBuildingsDto } from './dto/list-buildings.dto';
import { PlacesService } from './places.service';

@ApiTags('places')
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get('buildings')
  @ApiOperation({ summary: 'List imported buildings' })
  listBuildings(@Query() query: ListBuildingsDto) {
    return this.placesService.listBuildings(query);
  }

  @Get('buildings/:id')
  @ApiOperation({ summary: 'Get one building by id' })
  getBuildingById(@Param('id') id: string) {
    return this.placesService.getBuildingById(id);
  }

  @Post('buildings/import')
  @ApiOperation({ summary: 'Import buildings from an Excel path on disk' })
  importBuildings(@Body() dto: ImportBuildingsDto) {
    return this.placesService.importBuildings(dto);
  }

  @Post('buildings/import/file')
  @ApiOperation({ summary: 'Import buildings from an uploaded Excel file' })
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
    return this.placesService.importBuildings(dto, file?.buffer);
  }
}
