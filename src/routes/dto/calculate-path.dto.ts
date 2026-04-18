import { ApiProperty } from '@nestjs/swagger';

export class CalculatePathDto {
  @ApiProperty({
    example: 'ML',
  })
  from: string;

  @ApiProperty({
    example: 'RGD',
  })
  to: string;
}
