/**
 * 파일 스토리지 포트.
 * S3 등 오브젝트 스토리지 연동을 추상화한다.
 */
export abstract class StoragePort {
  /**
   * 파일을 업로드한다.
   *
   * @param key - 저장 경로 (S3 key)
   * @param body - 파일 바이너리
   * @param contentType - MIME 타입
   */
  abstract upload(key: string, body: Buffer, contentType: string): Promise<void>;

  /**
   * 파일을 다운로드한다.
   *
   * @param key - 저장 경로 (S3 key)
   * @returns 파일 바이너리
   */
  abstract download(key: string): Promise<Buffer>;

  /**
   * 파일을 삭제한다.
   *
   * @param key - 저장 경로 (S3 key)
   */
  abstract delete(key: string): Promise<void>;

  /**
   * Presigned URL을 생성한다.
   *
   * @param key - 저장 경로 (S3 key)
   * @param expiresIn - URL 유효 시간 (초, 기본 3600)
   * @returns Presigned URL
   */
  abstract getPresignedUrl(key: string, expiresIn?: number): Promise<string>;
}
