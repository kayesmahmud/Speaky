import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TranslateMessageDto, TranslateTextDto } from './dto/translation.dto';

@Injectable()
export class TranslationsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private async translateWithProvider(
    text: string,
    targetLang: string,
    sourceLang?: string,
  ): Promise<string> {
    // Check for DeepL API key first
    const deeplKey = this.configService.get<string>('DEEPL_API_KEY');

    if (deeplKey) {
      return this.translateWithDeepL(text, targetLang, sourceLang, deeplKey);
    }

    // Check for Google Translate API key
    const googleKey = this.configService.get<string>('GOOGLE_TRANSLATE_API_KEY');

    if (googleKey) {
      return this.translateWithGoogle(text, targetLang, sourceLang, googleKey);
    }

    // Fallback: Mock translation for development
    console.log('No translation API configured, using mock translation');
    return `[${targetLang}] ${text}`;
  }

  private async translateWithDeepL(
    text: string,
    targetLang: string,
    sourceLang: string | undefined,
    apiKey: string,
  ): Promise<string> {
    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: targetLang.toUpperCase(),
        ...(sourceLang && { source_lang: sourceLang.toUpperCase() }),
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.translations[0].text;
  }

  private async translateWithGoogle(
    text: string,
    targetLang: string,
    sourceLang: string | undefined,
    apiKey: string,
  ): Promise<string> {
    const params = new URLSearchParams({
      key: apiKey,
      q: text,
      target: targetLang,
      ...(sourceLang && { source: sourceLang }),
    });

    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?${params}`,
    );

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.translations[0].translatedText;
  }

  async translateMessage(userId: number, dto: TranslateMessageDto) {
    // Get the message and verify access
    const message = await this.prisma.message.findUnique({
      where: { id: dto.message_id },
      include: { connection: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user is part of this connection
    const connection = message.connection;
    if (connection.userAId !== userId && connection.userBId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Check if we already have this translation cached
    const existingTranslation = await this.prisma.translation.findFirst({
      where: {
        messageId: dto.message_id,
        targetLanguage: dto.target_language,
      },
    });

    if (existingTranslation) {
      return {
        id: existingTranslation.id,
        message_id: existingTranslation.messageId,
        source_language: existingTranslation.sourceLanguage,
        target_language: existingTranslation.targetLanguage,
        translated_text: existingTranslation.translatedText,
        created_at: existingTranslation.createdAt.toISOString(),
      };
    }

    // Translate the message
    const translatedText = await this.translateWithProvider(
      message.content,
      dto.target_language,
      dto.source_language,
    );

    // Cache the translation
    const translation = await this.prisma.translation.create({
      data: {
        messageId: dto.message_id,
        sourceLanguage: dto.source_language || 'auto',
        targetLanguage: dto.target_language,
        translatedText,
      },
    });

    return {
      id: translation.id,
      message_id: translation.messageId,
      source_language: translation.sourceLanguage,
      target_language: translation.targetLanguage,
      translated_text: translation.translatedText,
      created_at: translation.createdAt.toISOString(),
    };
  }

  async translateText(dto: TranslateTextDto) {
    const translatedText = await this.translateWithProvider(
      dto.text,
      dto.target_language,
      dto.source_language,
    );

    return {
      original_text: dto.text,
      translated_text: translatedText,
      source_language: dto.source_language || 'auto',
      target_language: dto.target_language,
    };
  }

  async getSupportedLanguages() {
    // Common languages for language exchange apps
    return [
      { code: 'EN', name: 'English' },
      { code: 'ES', name: 'Spanish' },
      { code: 'FR', name: 'French' },
      { code: 'DE', name: 'German' },
      { code: 'IT', name: 'Italian' },
      { code: 'PT', name: 'Portuguese' },
      { code: 'RU', name: 'Russian' },
      { code: 'ZH', name: 'Chinese' },
      { code: 'JA', name: 'Japanese' },
      { code: 'KO', name: 'Korean' },
      { code: 'AR', name: 'Arabic' },
      { code: 'HI', name: 'Hindi' },
      { code: 'TR', name: 'Turkish' },
      { code: 'PL', name: 'Polish' },
      { code: 'NL', name: 'Dutch' },
    ];
  }
}
