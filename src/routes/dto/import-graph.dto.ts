import { ApiPropertyOptional } from '@nestjs/swagger';

export class ImportGraphDto {
  @ApiPropertyOptional({
    example:
      'C:/Users/luish/Downloads/SAR/InteractiveMapUniandes_Back/Backend/move.xlsx',
  })
  filePath?: string;

  @ApiPropertyOptional({
    example: true,
  })
  replaceExisting?: boolean | string;

  @ApiPropertyOptional({
    example: true,
  })
  bidirectional?: boolean | string;
}
