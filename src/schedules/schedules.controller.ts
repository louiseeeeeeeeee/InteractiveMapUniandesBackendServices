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
import { AuthProvider } from '../common/enums/auth-provider.enum';
import { ImportScheduleDto } from './dto/import-schedule.dto';
import { ListSchedulesDto } from './dto/list-schedules.dto';
import { SchedulesService } from './schedules.service';

@ApiTags('schedules')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @ApiOperation({ summary: 'List schedules' })
  listSchedules(@Query() query: ListSchedulesDto) {
    return this.schedulesService.listSchedules(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one schedule by id' })
  getScheduleById(@Param('id') id: string) {
    return this.schedulesService.getScheduleById(id);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import a schedule from raw .ics content' })
  importFromBody(@Body() dto: ImportScheduleDto) {
    return this.schedulesService.importSchedule(dto);
  }

  @Post('import/default')
  @ApiOperation({ summary: 'Import the default sample .ics file' })
  importFromDefaultFile(@Body() dto: ImportScheduleDto) {
    return this.schedulesService.importDefaultSchedule(dto);
  }

  @Post('import/file')
  @ApiOperation({ summary: 'Import a schedule from an uploaded .ics file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        userId: { type: 'string' },
        userEmail: { type: 'string' },
        authProvider: { type: 'string', enum: Object.values(AuthProvider) },
        name: { type: 'string' },
        timezone: { type: 'string' },
        sourceUrl: { type: 'string' },
        replaceExisting: { type: 'boolean' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  importFromUploadedFile(
    @UploadedFile() file: { buffer?: Buffer; originalname?: string } | undefined,
    @Body() dto: ImportScheduleDto,
  ) {
    return this.schedulesService.importSchedule(
      dto,
      file?.buffer,
      file?.originalname,
    );
  }
}
