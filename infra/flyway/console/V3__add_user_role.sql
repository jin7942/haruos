-- users 테이블에 role 컬럼 추가
-- USER: 일반 사용자, ADMIN: 관리자
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER';

CREATE INDEX idx_users_role ON users(role);
