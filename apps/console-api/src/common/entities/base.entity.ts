import { CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

/**
 * 모든 엔티티의 공통 필드.
 * ID는 상속하지 않음 (엔티티마다 전략이 다름).
 */
export abstract class BaseEntity {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/**
 * Soft delete가 필요한 엔티티용.
 */
export abstract class SoftDeletableEntity extends BaseEntity {
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
