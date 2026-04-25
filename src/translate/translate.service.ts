import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class TranslateService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async translateText(text: string, targetLang: string, sourceLang: string = 'es'): Promise<string> {
    const key = `translate:${sourceLang}:${targetLang}:${text}`; // Cache key per pair + text
    const cached = await this.cache.get<string>(key);
    if (cached) return cached; // Return cached translation

    // One quick retry — MyMemory occasionally drops a request.
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
        const response = await fetch(url);
        const data: any = await response.json();

        const translated = data?.responseData?.translatedText;
        if (typeof translated === 'string' && translated.length > 0) {
          await this.cache.set(key, translated, 24 * 60 * 60 * 1000); // Keep 24h
          return translated;
        }
        lastErr = new Error('Invalid response from translation API');
      } catch (error: unknown) {
        lastErr = error;
      }
    }
    const message = lastErr instanceof Error ? lastErr.message : 'Translation provider error';
    throw new ServiceUnavailableException(`Translation failed: ${message}`); // 503 maps better than 500 for upstream issues
  }
}
