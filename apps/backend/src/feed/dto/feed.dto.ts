import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MaxLength(2000)
  content: string;

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsString()
  @IsOptional()
  language?: string;
}

export class CreateCommentDto {
  @IsString()
  @MaxLength(500)
  content: string;
}
