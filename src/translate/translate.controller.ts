import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { TranslateService } from './translate.service';
import { ApiQuery, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('translate')
@Controller('translate')
export class TranslateController {
  constructor(private readonly translateService: TranslateService) {}

  @Get()
  @ApiOperation({ summary: 'Translate text via external API' })
  @ApiQuery({ name: 'text', required: true, description: 'Text to translate' })
  @ApiQuery({ name: 'targetLang', required: true, description: 'Target language code (e.g. en)' })
  @ApiQuery({ name: 'sourceLang', required: false, description: 'Source language code (e.g. es)' })
  async translate(
    @Query('text') text: string,
    @Query('targetLang') targetLang: string,
    @Query('sourceLang') sourceLang?: string,
  ) {
    const cleanText = text?.trim();
    const cleanTarget = targetLang?.trim();
    if (!cleanText) throw new BadRequestException('text query parameter is required');
    if (!cleanTarget) throw new BadRequestException('targetLang query parameter is required (e.g. en, es)');
    const translatedText = await this.translateService.translateText(cleanText, cleanTarget, sourceLang?.trim() || 'es');
    return {
      original: cleanText,
      translated: translatedText,
      targetLanguage: cleanTarget,
    };
  }
}
