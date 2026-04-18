import { AuthProvider } from '../../common/enums/auth-provider.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ImportScheduleDto {
  @ApiPropertyOptional()
  userId?: string;

  @ApiPropertyOptional({
    example: 'demo@uniandes.edu.co',
  })
  userEmail?: string;

  @ApiPropertyOptional({
    enum: AuthProvider,
  })
  authProvider?: AuthProvider;

  @ApiPropertyOptional({
    example: 'Horario semestre 2',
  })
  name?: string;

  @ApiPropertyOptional({
    example: 'America/Bogota',
  })
  timezone?: string;

  @ApiPropertyOptional()
  sourceUrl?: string;

  @ApiPropertyOptional({
    description: 'Raw .ics calendar content.',
  })
  icsContent?: string;

  @ApiPropertyOptional({
    example: true,
  })
  replaceExisting?: boolean | string;
}
