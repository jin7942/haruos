-- 공통코드 시드 데이터
-- 테넌트 관리에 필요한 기본 코드 그룹 + 코드

-- 테넌트 상태
INSERT INTO code_groups (group_code, name, description) VALUES ('TENANT_STATUS', '테넌트 상태', '테넌트의 생애주기 상태');
INSERT INTO codes (id, group_code, code, name, sort_order, is_enabled) VALUES
  (gen_random_uuid(), 'TENANT_STATUS', 'CREATING', '생성 중', 1, true),
  (gen_random_uuid(), 'TENANT_STATUS', 'ACTIVE', '활성', 2, true),
  (gen_random_uuid(), 'TENANT_STATUS', 'SUSPENDED', '일시 중지', 3, true),
  (gen_random_uuid(), 'TENANT_STATUS', 'DELETED', '삭제됨', 4, true);

-- 플랜 타입
INSERT INTO code_groups (group_code, name, description) VALUES ('PLAN_TYPE', '플랜 타입', '테넌트 인프라 사양 플랜');
INSERT INTO codes (id, group_code, code, name, sort_order, is_enabled) VALUES
  (gen_random_uuid(), 'PLAN_TYPE', 'STARTER', 'Starter', 1, true),
  (gen_random_uuid(), 'PLAN_TYPE', 'STANDARD', 'Standard', 2, true),
  (gen_random_uuid(), 'PLAN_TYPE', 'PRO', 'Pro', 3, true);

-- AWS 자격증명 상태
INSERT INTO code_groups (group_code, name, description) VALUES ('AWS_CREDENTIAL_STATUS', 'AWS 자격증명 상태', 'Role ARN 검증 상태');
INSERT INTO codes (id, group_code, code, name, sort_order, is_enabled) VALUES
  (gen_random_uuid(), 'AWS_CREDENTIAL_STATUS', 'PENDING', '검증 대기', 1, true),
  (gen_random_uuid(), 'AWS_CREDENTIAL_STATUS', 'VALID', '유효', 2, true),
  (gen_random_uuid(), 'AWS_CREDENTIAL_STATUS', 'INVALID', '무효', 3, true);

-- 프로비저닝 상태
INSERT INTO code_groups (group_code, name, description) VALUES ('PROVISIONING_STATUS', '프로비저닝 상태', 'Terraform + Ansible 실행 상태');
INSERT INTO codes (id, group_code, code, name, sort_order, is_enabled) VALUES
  (gen_random_uuid(), 'PROVISIONING_STATUS', 'PENDING', '대기', 1, true),
  (gen_random_uuid(), 'PROVISIONING_STATUS', 'IN_PROGRESS', '진행 중', 2, true),
  (gen_random_uuid(), 'PROVISIONING_STATUS', 'COMPLETED', '완료', 3, true),
  (gen_random_uuid(), 'PROVISIONING_STATUS', 'FAILED', '실패', 4, true),
  (gen_random_uuid(), 'PROVISIONING_STATUS', 'ROLLING_BACK', '롤백 중', 5, true);

-- 도메인 타입
INSERT INTO code_groups (group_code, name, description) VALUES ('DOMAIN_TYPE', '도메인 타입', '서브도메인 또는 커스텀 도메인');
INSERT INTO codes (id, group_code, code, name, sort_order, is_enabled) VALUES
  (gen_random_uuid(), 'DOMAIN_TYPE', 'SUBDOMAIN', '서브도메인', 1, true),
  (gen_random_uuid(), 'DOMAIN_TYPE', 'CUSTOM', '커스텀', 2, true);

-- 도메인 상태
INSERT INTO code_groups (group_code, name, description) VALUES ('DOMAIN_STATUS', '도메인 상태', 'DNS 검증 및 SSL 발급 상태');
INSERT INTO codes (id, group_code, code, name, sort_order, is_enabled) VALUES
  (gen_random_uuid(), 'DOMAIN_STATUS', 'PENDING', '대기', 1, true),
  (gen_random_uuid(), 'DOMAIN_STATUS', 'VERIFYING', 'DNS 확인 중', 2, true),
  (gen_random_uuid(), 'DOMAIN_STATUS', 'ACTIVE', '활성', 3, true),
  (gen_random_uuid(), 'DOMAIN_STATUS', 'FAILED', '실패', 4, true);

-- DNS 프로바이더
INSERT INTO code_groups (group_code, name, description) VALUES ('DNS_PROVIDER', 'DNS 프로바이더', '도메인 DNS 관리 방식');
INSERT INTO codes (id, group_code, code, name, sort_order, is_enabled) VALUES
  (gen_random_uuid(), 'DNS_PROVIDER', 'CLOUDFLARE', 'Cloudflare', 1, true),
  (gen_random_uuid(), 'DNS_PROVIDER', 'ROUTE53', 'Route 53', 2, true),
  (gen_random_uuid(), 'DNS_PROVIDER', 'MANUAL', '수동', 3, true);

-- SSL 상태
INSERT INTO code_groups (group_code, name, description) VALUES ('SSL_STATUS', 'SSL 상태', 'SSL 인증서 발급 상태');
INSERT INTO codes (id, group_code, code, name, sort_order, is_enabled) VALUES
  (gen_random_uuid(), 'SSL_STATUS', 'PENDING', '발급 대기', 1, true),
  (gen_random_uuid(), 'SSL_STATUS', 'ACTIVE', '활성', 2, true),
  (gen_random_uuid(), 'SSL_STATUS', 'FAILED', '실패', 3, true);

-- 구독 상태
INSERT INTO code_groups (group_code, name, description) VALUES ('SUBSCRIPTION_STATUS', '구독 상태', '결제 구독 상태');
INSERT INTO codes (id, group_code, code, name, sort_order, is_enabled) VALUES
  (gen_random_uuid(), 'SUBSCRIPTION_STATUS', 'TRIAL', '무료 체험', 1, true),
  (gen_random_uuid(), 'SUBSCRIPTION_STATUS', 'ACTIVE', '활성', 2, true),
  (gen_random_uuid(), 'SUBSCRIPTION_STATUS', 'CANCELLED', '취소', 3, true),
  (gen_random_uuid(), 'SUBSCRIPTION_STATUS', 'EXPIRED', '만료', 4, true);

-- 메트릭 타입
INSERT INTO code_groups (group_code, name, description) VALUES ('METRIC_TYPE', '메트릭 타입', 'CloudWatch 모니터링 메트릭');
INSERT INTO codes (id, group_code, code, name, sort_order, is_enabled) VALUES
  (gen_random_uuid(), 'METRIC_TYPE', 'ECS_CPU', 'ECS CPU', 1, true),
  (gen_random_uuid(), 'METRIC_TYPE', 'ECS_MEMORY', 'ECS 메모리', 2, true),
  (gen_random_uuid(), 'METRIC_TYPE', 'RDS_CPU', 'RDS CPU', 3, true),
  (gen_random_uuid(), 'METRIC_TYPE', 'RDS_STORAGE', 'RDS 스토리지', 4, true),
  (gen_random_uuid(), 'METRIC_TYPE', 'S3_SIZE', 'S3 용량', 5, true);

-- 알림 타입
INSERT INTO code_groups (group_code, name, description) VALUES ('ALERT_TYPE', '알림 타입', '모니터링 알림 종류');
INSERT INTO codes (id, group_code, code, name, sort_order, is_enabled) VALUES
  (gen_random_uuid(), 'ALERT_TYPE', 'COST', '비용 초과', 1, true),
  (gen_random_uuid(), 'ALERT_TYPE', 'CPU', 'CPU 초과', 2, true),
  (gen_random_uuid(), 'ALERT_TYPE', 'DB_STORAGE', 'DB 스토리지 초과', 3, true),
  (gen_random_uuid(), 'ALERT_TYPE', 'AI_TOKEN', 'AI 토큰 한도', 4, true);
