import { Injectable } from '@nestjs/common';

@Injectable()
export class DocEngineService {
  /**
   * Markdown 문자열을 DOCX 바이너리로 변환.
   * @param markdown - 변환할 Markdown 문자열
   * @returns DOCX 파일 Buffer
   */
  async markdownToDocx(markdown: string): Promise<Buffer> {
    throw new Error('Not implemented');
  }
}
