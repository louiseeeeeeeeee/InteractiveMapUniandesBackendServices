import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class TranslateService {
  async translateText(text: string, targetLang: string, sourceLang: string = 'es'): Promise<string> {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
      const response = await fetch(url);
      const data: any = await response.json();
      
      if (data && data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
      throw new Error('Invalid response from translation API');
    } catch (error: any) {
      throw new InternalServerErrorException('Translation failed: ' + error.message);
    }
  }
}
