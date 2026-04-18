import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListSchedulesDto {
  @ApiPropertyOptional()
  userId?: string;

  @ApiPropertyOptional()
  userEmail?: string;
}
