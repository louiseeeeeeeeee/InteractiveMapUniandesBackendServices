import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  program?: string; // Program / carrera

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  profileImage?: string; // URL from Firebase Storage
}
