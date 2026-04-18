import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListBuildingsDto {
  @ApiPropertyOptional({
    example: 'ML',
  })
  search?: string;
}
