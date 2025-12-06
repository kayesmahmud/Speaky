import { IsOptional, IsString } from 'class-validator';

export class DiscoveryQueryDto {
  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  level?: string;
}

export class DiscoveryUserDto {
  id: number;
  name: string;
  native_language: string | null;
  learning_language: string | null;
  bio: string | null;
  avatar_url: string | null;
}
