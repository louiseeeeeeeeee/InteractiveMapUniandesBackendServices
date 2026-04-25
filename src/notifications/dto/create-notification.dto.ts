import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  @MaxLength(40)
  type: string; // "class" | "alert" | "promo" | ...

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  icon?: string;

  @IsOptional()
  @IsUUID()
  userId?: string; // Omit to broadcast to everyone
}
