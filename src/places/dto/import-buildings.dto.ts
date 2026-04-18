import { ApiPropertyOptional } from '@nestjs/swagger';

export class ImportBuildingsDto {
  @ApiPropertyOptional({
    example:
      'C:/Users/luish/Downloads/SAR/InteractiveMapUniandes_Back/Backend/edificios_y_casas.xlsx',
  })
  filePath?: string;

  @ApiPropertyOptional({
    example: true,
  })
  replaceExisting?: boolean | string;
}
