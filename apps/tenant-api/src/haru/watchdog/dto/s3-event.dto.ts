import { ApiProperty } from '@nestjs/swagger';

/** S3 이벤트 DTO. SQS를 통해 수신된 S3 알림 이벤트. */
export class S3EventDto {
  @ApiProperty({ description: '이벤트 이름 (예: ObjectCreated:Put)' })
  eventName: string;

  @ApiProperty({ description: '버킷 이름' })
  bucketName: string;

  @ApiProperty({ description: '객체 키 (파일 경로)' })
  objectKey: string;

  @ApiProperty({ description: '객체 크기 (bytes)' })
  objectSize: number;

  static of(eventName: string, bucketName: string, objectKey: string, objectSize: number): S3EventDto {
    const dto = new S3EventDto();
    dto.eventName = eventName;
    dto.bucketName = bucketName;
    dto.objectKey = objectKey;
    dto.objectSize = objectSize;
    return dto;
  }
}
