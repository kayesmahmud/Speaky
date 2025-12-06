import { IsNumber, IsIn } from 'class-validator';

export class CreateConnectionDto {
  @IsNumber()
  user_id: number;
}

export class UpdateConnectionDto {
  @IsIn(['accepted', 'blocked'])
  status: 'accepted' | 'blocked';
}

export class ConnectionResponseDto {
  id: number;
  user_a: number;
  user_b: number;
  status: string;
  created_at: string;
  partner?: {
    id: number;
    name: string;
    avatar_url: string | null;
    native_language: string | null;
    learning_language: string | null;
  };
}
