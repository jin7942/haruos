-- =============================================================
-- HaruOS Console DB Schema
-- Generated from console-erd.dbml
-- Database: PostgreSQL 16
-- =============================================================

-- -------------------------------------------------------------
-- 공통코드
-- -------------------------------------------------------------

CREATE TABLE code_groups (
    group_code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_code VARCHAR(50) NOT NULL REFERENCES code_groups(group_code),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (group_code, code)
);

-- -------------------------------------------------------------
-- 인증
-- -------------------------------------------------------------

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verified_at TIMESTAMP,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- -------------------------------------------------------------
-- 테넌트
-- -------------------------------------------------------------

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'CREATING',
    plan VARCHAR(50) NOT NULL DEFAULT 'STARTER',
    region VARCHAR(50) NOT NULL,
    trial_ends_at TIMESTAMP,
    suspended_at TIMESTAMP,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_user_id ON tenants(user_id);
CREATE INDEX idx_tenants_status ON tenants(status);

-- -------------------------------------------------------------
-- AWS 연동
-- -------------------------------------------------------------

CREATE TABLE aws_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id),
    role_arn VARCHAR(500) NOT NULL,
    external_id VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    validated_at TIMESTAMP,
    last_assumed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- 프로비저닝
-- -------------------------------------------------------------

CREATE TABLE provisioning_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    current_step VARCHAR(100),
    total_steps INT NOT NULL DEFAULT 0,
    completed_steps INT NOT NULL DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    terraform_state_key VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_provisioning_jobs_tenant_id ON provisioning_jobs(tenant_id);

CREATE TABLE provisioning_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES provisioning_jobs(id),
    step VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    message TEXT,
    detail JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_provisioning_logs_job_id ON provisioning_logs(job_id);

-- -------------------------------------------------------------
-- 도메인
-- -------------------------------------------------------------

CREATE TABLE domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    domain VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    dns_provider VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    is_primary BOOLEAN NOT NULL DEFAULT false,
    cname_target VARCHAR(255),
    ssl_status VARCHAR(50),
    dns_verified_at TIMESTAMP,
    cloudflare_zone_id VARCHAR(100),
    cloudflare_api_token_enc VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_domains_tenant_id ON domains(tenant_id);

-- -------------------------------------------------------------
-- 모니터링
-- -------------------------------------------------------------

CREATE TABLE metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    metric_type VARCHAR(50) NOT NULL,
    value DECIMAL(20,4) NOT NULL,
    unit VARCHAR(20),
    collected_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_metrics_tenant_type_collected ON metrics(tenant_id, metric_type, collected_at);

CREATE TABLE cost_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    service VARCHAR(50) NOT NULL,
    cost DECIMAL(10,4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_cost_records_tenant_period ON cost_records(tenant_id, period_start);

CREATE TABLE ai_usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    model_id VARCHAR(100) NOT NULL,
    input_tokens INT NOT NULL DEFAULT 0,
    output_tokens INT NOT NULL DEFAULT 0,
    estimated_cost DECIMAL(10,6) NOT NULL DEFAULT 0,
    collected_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_records_tenant_collected ON ai_usage_records(tenant_id, collected_at);

CREATE TABLE alert_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    alert_type VARCHAR(50) NOT NULL,
    threshold DECIMAL(20,4) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    last_triggered_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, alert_type)
);

CREATE TABLE alert_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_config_id UUID NOT NULL REFERENCES alert_configs(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    triggered_value DECIMAL(20,4) NOT NULL,
    message TEXT NOT NULL,
    notified_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_histories_tenant_id ON alert_histories(tenant_id);

-- -------------------------------------------------------------
-- 과금 (P4)
-- -------------------------------------------------------------

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id),
    status VARCHAR(50) NOT NULL DEFAULT 'TRIAL',
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- 인프라 정보 (프로비저닝 결과)
-- -------------------------------------------------------------

CREATE TABLE tenant_infra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id),
    ecs_cluster_arn VARCHAR(500),
    ecs_service_arn VARCHAR(500),
    rds_endpoint VARCHAR(500),
    rds_instance_id VARCHAR(100),
    s3_bucket_name VARCHAR(255),
    alb_dns_name VARCHAR(500),
    alb_arn VARCHAR(500),
    vpc_id VARCHAR(50),
    ecr_repository_url VARCHAR(500),
    current_task_definition VARCHAR(500),
    current_app_version VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
