import { Injectable, Logger } from '@nestjs/common';
import { DocumentResultResponseDto } from './dto/document-result.response.dto';
import { ValidationException } from '../../common/exceptions/business.exception';

/**
 * 문서 변환 엔진 서비스.
 * Markdown -> DOCX 변환을 담당한다.
 * 외부 연동 없이 로컬 라이브러리(pandoc 등)로 처리.
 */
@Injectable()
export class DocEngineService {
  private readonly logger = new Logger(DocEngineService.name);

  /**
   * Markdown 문자열을 DOCX 바이너리로 변환한다.
   *
   * @param markdown - 변환할 Markdown 문자열
   * @param filename - 출력 파일명 (확장자 제외, 기본값: 'document')
   * @returns DOCX 파일 Buffer
   * @throws ValidationException Markdown이 비어있는 경우
   */
  async markdownToDocx(markdown: string, filename = 'document'): Promise<Buffer> {
    if (!markdown || markdown.trim().length === 0) {
      throw new ValidationException('Markdown content cannot be empty');
    }

    this.logger.log(`Markdown -> DOCX 변환: filename=${filename}, length=${markdown.length}`);

    // 프로덕션에서는 pandoc 또는 docx 라이브러리로 실제 변환.
    // 현재는 stub으로 Markdown 원문을 Buffer로 반환.
    return Buffer.from(markdown, 'utf-8');
  }

  /**
   * Markdown -> DOCX 변환 결과 메타데이터를 반환한다.
   *
   * @param markdown - 변환할 Markdown 문자열
   * @param filename - 출력 파일명 (확장자 제외)
   * @returns 변환 결과 메타데이터
   * @throws ValidationException Markdown이 비어있는 경우
   */
  async convert(markdown: string, filename = 'document'): Promise<DocumentResultResponseDto> {
    const buffer = await this.markdownToDocx(markdown, filename);
    const outputFilename = `${filename}.docx`;

    return DocumentResultResponseDto.from(
      outputFilename,
      buffer.length,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
  }
}
