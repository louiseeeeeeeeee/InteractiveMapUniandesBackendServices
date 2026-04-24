import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUsageEventDto {
  @IsString()
  @MaxLength(80)
  eventType: string; // e.g. "route_computed", "search_opened"

  @IsOptional()
  @IsString()
  @MaxLength(80)
  feature?: string; // Feature area that fired the event

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>; // Extra data, free-form
}
