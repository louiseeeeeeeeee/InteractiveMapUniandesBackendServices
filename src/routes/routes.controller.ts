import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CalculateClassPathDto } from './dto/calculate-class-path.dto';
import { CalculatePathDto } from './dto/calculate-path.dto';
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

  @Get('graph/nearest')
  @ApiOperation({ summary: 'Find the graph node closest to a lat/lng' })
  findNearest(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.routesService.findNearestNode(parseFloat(lat), parseFloat(lng));
  }

  @Get('graph/path')
  @ApiOperation({ summary: 'Calculate the shortest path in the campus graph' })
  calculateShortestPath(@Query() query: CalculatePathDto) {
    return this.routesService.calculateShortestPath(query);
  }

  @Get('graph/class-path')
  @ApiOperation({ summary: 'Calculate the shortest path to a scheduled class destination' })
  calculatePathToClass(@Query() query: CalculateClassPathDto) {
    return this.routesService.calculatePathToClass(query);
  }
}
