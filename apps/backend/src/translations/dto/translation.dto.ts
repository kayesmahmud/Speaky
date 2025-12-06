import { IsInt, IsString, IsOptional } from 'class-validator';

export class TranslateMessageDto {
  @IsInt()
  message_id: number;

  @IsString()
  target_language: string;

  @IsString()
  @IsOptional()
  source_language?: string;
}

export class TranslateTextDto {
  @IsString()
  text: string;

  @IsString()
  target_language: string;

  @IsString()
  @IsOptional()
  source_language?: string;
}
