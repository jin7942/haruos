import { Entity, PrimaryColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/** 공통코드 그룹. TENANT_STATUS, PLAN_TYPE 등. */
@Entity('code_groups')
export class CodeGroupEntity extends BaseEntity {
  @PrimaryColumn({ name: 'group_code', length: 50 })
  groupCode: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 500, nullable: true })
  description: string | null;
}
