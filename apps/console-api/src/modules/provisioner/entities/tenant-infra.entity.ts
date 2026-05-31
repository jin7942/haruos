import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * 테넌트 인프라 정보 엔티티.
 * 프로비저닝 완료 후 생성된 AWS 리소스 정보를 저장한다.
 */
@Entity('tenant_infra')
export class TenantInfraEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', unique: true })
  tenantId: string;

  @Column({ name: 'ecs_cluster_arn', type: 'varchar', length: 500, nullable: true })
  ecsClusterArn: string | null;

  @Column({ name: 'ecs_service_arn', type: 'varchar', length: 500, nullable: true })
  ecsServiceArn: string | null;

  @Column({ name: 'rds_endpoint', type: 'varchar', length: 500, nullable: true })
  rdsEndpoint: string | null;

  @Column({ name: 'rds_instance_id', type: 'varchar', length: 100, nullable: true })
  rdsInstanceId: string | null;

  @Column({ name: 's3_bucket_name', type: 'varchar', length: 255, nullable: true })
  s3BucketName: string | null;

  @Column({ name: 'alb_dns_name', type: 'varchar', length: 500, nullable: true })
  albDnsName: string | null;

  @Column({ name: 'alb_arn', type: 'varchar', length: 500, nullable: true })
  albArn: string | null;

  @Column({ name: 'vpc_id', type: 'varchar', length: 50, nullable: true })
  vpcId: string | null;

  @Column({ name: 'ecr_repository_url', type: 'varchar', length: 500, nullable: true })
  ecrRepositoryUrl: string | null;

  @Column({ name: 'current_task_definition', type: 'varchar', length: 500, nullable: true })
  currentTaskDefinition: string | null;

  @Column({ name: 'current_app_version', type: 'varchar', length: 50, nullable: true })
  currentAppVersion: string | null;

  /**
   * 테넌트 인프라 정보 생성 팩토리.
   *
   * @param tenantId - 대상 테넌트 ID
   */
  static create(tenantId: string): TenantInfraEntity {
    const infra = new TenantInfraEntity();
    infra.tenantId = tenantId;
    return infra;
  }
}
