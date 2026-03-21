import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

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

  @Column({ name: 'status' })
  status: string;

  @Column({ name: 'validated_at', type: 'timestamptz', nullable: true })
  validatedAt: Date | null;
}
