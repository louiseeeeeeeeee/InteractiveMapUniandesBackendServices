import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCrashEventDto {
  @IsString()
  @MaxLength(500)
  message: string; // Short crash message

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  stackTrace?: string; // Stack dump

  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;

  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, unknown>; // os/model/etc
}
