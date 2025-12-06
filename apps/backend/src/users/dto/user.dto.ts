import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  native_language?: string;

  @IsString()
  @IsOptional()
  learning_language?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  avatar_url?: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}

export class UserResponseDto {
  id: number;
  email: string;
  name: string;
  native_language: string | null;
  learning_language: string | null;
  bio: string | null;
  avatar_url: string | null;
  timezone: string | null;
  is_active: boolean;
  last_active: string;
  created_at: string;
}
