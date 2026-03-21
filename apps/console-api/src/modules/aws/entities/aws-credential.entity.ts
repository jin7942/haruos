import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

/**
 * AWS 자격증명 엔티티.
 * 테넌트별 IAM Role ARN과 검증 상태를 관리한다.
 * 상태 변경은 비즈니스 메서드로만 가능 (setter 금지).
 */
@Entity('aws_credentials')
export class AwsCredentialEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'role_arn' })
  roleArn: string;

  @Column({ name: 'external_id' })
  externalId: string;

  @Column({ name: 'region' })
  region: string;

  @Column({ name: 'status', default: 'PENDING' })
  status: string;

  @Column({ name: 'validated_at', type: 'timestamptz', nullable: true })
  validatedAt: Date | null;

  /**
   * AWS 자격증명 생성 팩토리.
   *
   * @param tenantId - 테넌트 ID
   * @param roleArn - IAM Role ARN
   * @param externalId - External ID
   * @param region - AWS 리전
   */
  static create(
    tenantId: string,
    roleArn: string,
    externalId: string,
    region: string,
  ): AwsCredentialEntity {
    const entity = new AwsCredentialEntity();
    entity.tenantId = tenantId;
    entity.roleArn = roleArn;
    entity.externalId = externalId;
    entity.region = region;
    entity.status = 'PENDING';
    entity.validatedAt = null;
    return entity;
  }

  /**
   * PENDING -> VALIDATED 상태 전이.
   * Role ARN 검증 성공 시 호출.
   *
   * @throws InvalidStateTransitionException PENDING 상태가 아닌 경우
   */
  validate(): void {
    if (this.status !== 'PENDING') {
      throw new InvalidStateTransitionException(this.status, 'VALIDATED');
    }
    this.status = 'VALIDATED';
    this.validatedAt = new Date();
  }

  /**
   * VALIDATED -> INVALID 상태 전이.
   * 자격증명이 만료되거나 무효화될 때 호출.
   *
   * @throws InvalidStateTransitionException VALIDATED 상태가 아닌 경우
   */
  invalidate(): void {
    if (this.status !== 'VALIDATED') {
      throw new InvalidStateTransitionException(this.status, 'INVALID');
    }
    this.status = 'INVALID';
    this.validatedAt = null;
  }
}
