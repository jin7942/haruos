/**
 * 파일 스토리지 포트.
 * S3 등 오브젝트 스토리지 연동.
 */
export abstract class StoragePort {
  abstract upload(key: string, body: Buffer, contentType: string): Promise<void>;
  abstract download(key: string): Promise<Buffer>;
  abstract delete(key: string): Promise<void>;
  abstract getPresignedUrl(key: string, expiresIn?: number): Promise<string>;
}
