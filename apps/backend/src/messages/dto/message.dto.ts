import { IsString, IsIn, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  content: string;

  @IsIn(['text', 'image'])
  @IsOptional()
  type?: 'text' | 'image';
}

export class MessageResponseDto {
  id: number;
  connection_id: number;
  sender_id: number;
  content: string;
  type: string;
  created_at: string;
  is_flagged: boolean;
}
