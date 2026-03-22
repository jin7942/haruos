import type { BadgeVariant } from '../types/ui';

/** 테넌트 상태별 뱃지 variant 매핑. */
export function getTenantStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'ACTIVE': return 'success';
    case 'CREATING': return 'info';
    case 'SUSPENDED': return 'warning';
    case 'DELETING': return 'danger';
    default: return 'default';
  }
}

/** 테넌트 상태 한글 라벨. */
export function getTenantStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE': return '활성';
    case 'CREATING': return '생성 중';
    case 'SUSPENDED': return '중지됨';
    case 'DELETING': return '삭제 중';
    default: return status;
  }
}
