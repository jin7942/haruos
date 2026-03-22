import { Injectable, Logger } from '@nestjs/common';
import { S3EventDto } from './dto/s3-event.dto';

/**
 * S3 이벤트 리스너.
 * SQS를 통해 수신된 S3 이벤트를 처리한다.
 * 현재는 로그만 출력하며, 실제 처리 로직은 향후 구현 예정.
 */
@Injectable()
export class S3EventListener {
  private readonly logger = new Logger(S3EventListener.name);

  /**
   * S3 객체 생성 이벤트 처리.
   *
   * @param event - S3 이벤트 데이터
   */
  async handleObjectCreated(event: S3EventDto): Promise<void> {
    this.logger.log(
      `S3 ObjectCreated: bucket=${event.bucketName}, key=${event.objectKey}, size=${event.objectSize}`,
    );
    // 향후 구현: 파일 인덱싱, 지식베이스 업데이트 등
  }

  /**
   * S3 객체 삭제 이벤트 처리.
   *
   * @param event - S3 이벤트 데이터
   */
  async handleObjectDeleted(event: S3EventDto): Promise<void> {
    this.logger.log(
      `S3 ObjectDeleted: bucket=${event.bucketName}, key=${event.objectKey}`,
    );
    // 향후 구현: 인덱스 제거, 지식베이스 업데이트 등
  }
}
