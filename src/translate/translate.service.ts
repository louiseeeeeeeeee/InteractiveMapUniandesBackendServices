import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class TranslateService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async translateText(text: string, targetLang: string, sourceLang: string = 'es'): Promise<string> {
    const key = `translate:${sourceLang}:${targetLang}:${text}`; // Cache key per pair + text
    const cached = await this.cache.get<string>(key);
    if (cached) return cached; // Return cached translation

    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
      const response = await fetch(url);
      const data: any = await response.json();

      if (data && data.responseData && data.responseData.translatedText) {
        const translated = data.responseData.translatedText;
        await this.cache.set(key, translated, 24 * 60 * 60 * 1000); // Keep 24h
        return translated;
      }
      throw new Error('Invalid response from translation API');
    } catch (error: any) {
      throw new InternalServerErrorException('Translation failed: ' + error.message);
    }
  }
}
