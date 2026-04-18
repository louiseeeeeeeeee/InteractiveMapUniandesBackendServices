import {
  Body,
  Controller,
  Get,
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
import { CalculatePathDto } from './dto/calculate-path.dto';
import { ImportGraphDto } from './dto/import-graph.dto';
import { RoutesService } from './routes.service';

@ApiTags('routes')
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get('graph/nodes')
  @ApiOperation({ summary: 'List campus graph nodes' })
  listCampusNodes() {
    return this.routesService.listCampusNodes();
  }

  @Get('graph/path')
  @ApiOperation({ summary: 'Calculate the shortest path in the campus graph' })
  calculateShortestPath(@Query() query: CalculatePathDto) {
    return this.routesService.calculateShortestPath(query);
  }

  @Post('graph/import')
  @ApiOperation({ summary: 'Import the campus graph from an Excel path on disk' })
  importCampusGraph(@Body() dto: ImportGraphDto) {
    return this.routesService.importCampusGraph(dto);
  }

  @Post('graph/import/file')
  @ApiOperation({ summary: 'Import the campus graph from an uploaded Excel file' })
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
    return this.routesService.importCampusGraph(dto, file?.buffer);
  }
}
