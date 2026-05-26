import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/**
 * V3-B — Messaging DTOs (Socket.IO + REST).
 *
 * Conversation 1:1 entre deux User d'un même tenant. Multi-party reporté V9.
 */

export class CreateConversationDto {
  @ApiProperty({ description: 'User ID du second participant (le premier = sender)' })
  @IsString()
  @MinLength(1)
  recipientUserId!: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  @MinLength(1)
  conversationId!: string;

  @ApiProperty({ description: 'Body du message (texte plain, 1-2000 chars)' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string;
}

export class ListMessagesQueryDto {
  @ApiPropertyOptional({ description: 'Cursor : message ID antérieur (pagination)' })
  @IsOptional()
  @IsString()
  before?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export interface ParticipantSummary {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export class ConversationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ type: [Object] }) participants!: ParticipantSummary[];
  @ApiPropertyOptional({ description: "Dernier message (preview, si présent)" })
  lastMessage?: { id: string; body: string; senderId: string; createdAt: Date };
  @ApiProperty({ description: "Nombre de messages non lus pour l'utilisateur courant" })
  unreadCount!: number;
}

export class MessageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() conversationId!: string;
  @ApiProperty() senderId!: string;
  @ApiProperty() body!: string;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional() readAt?: Date | null;
}

export class ListConversationsResponseDto {
  @ApiProperty({ type: [ConversationResponseDto] })
  items!: ConversationResponseDto[];
}

export class ListMessagesResponseDto {
  @ApiProperty({ type: [MessageResponseDto] })
  items!: MessageResponseDto[];
  @ApiProperty({ description: 'true s’il existe encore des messages plus anciens' })
  hasMore!: boolean;
}
