-- =============================================================
-- HaruOS Tenant App DB Schema
-- Generated from tenant-erd.dbml
-- Database: PostgreSQL 16 + pgvector
-- 테넌트별 독립 RDS 인스턴스
-- =============================================================

-- pgvector 확장
CREATE EXTENSION IF NOT EXISTS vector;

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
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_codes_user_code ON otp_codes(user_id, code);

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
-- 대화 (Haru 오케스트레이터)
-- -------------------------------------------------------------

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    token_count INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- -------------------------------------------------------------
-- 프로젝트
-- -------------------------------------------------------------

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    category VARCHAR(50),
    clickup_space_id VARCHAR(50),
    progress INT NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_by ON projects(created_by);

CREATE TABLE project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'TODO',
    priority VARCHAR(20),
    assignee_id UUID REFERENCES users(id),
    due_date TIMESTAMP,
    clickup_task_id VARCHAR(50),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX idx_project_tasks_status ON project_tasks(status);
CREATE INDEX idx_project_tasks_assignee_id ON project_tasks(assignee_id);

-- -------------------------------------------------------------
-- 일정
-- -------------------------------------------------------------

CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP,
    is_all_day BOOLEAN NOT NULL DEFAULT false,
    location VARCHAR(300),
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
    recurrence_rule VARCHAR(200),
    reminder_minutes INT,
    project_id UUID REFERENCES projects(id),
    clickup_task_id VARCHAR(50),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedules_start_end ON schedules(start_at, end_at);
CREATE INDEX idx_schedules_project_id ON schedules(project_id);
CREATE INDEX idx_schedules_created_by ON schedules(created_by);

-- -------------------------------------------------------------
-- 문서
-- -------------------------------------------------------------

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    content TEXT,
    summary TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    project_id UUID REFERENCES projects(id),
    s3_key VARCHAR(500),
    word_count INT DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_created_by ON documents(created_by);

CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id),
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1024),
    token_count INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);

CREATE TABLE action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id),
    content VARCHAR(500) NOT NULL,
    assignee_name VARCHAR(100),
    due_date TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    clickup_task_id VARCHAR(50),
    project_task_id UUID REFERENCES project_tasks(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_action_items_document_id ON action_items(document_id);

-- -------------------------------------------------------------
-- 파일
-- -------------------------------------------------------------

CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name VARCHAR(500) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100),
    category VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'UPLOADED',
    project_id UUID REFERENCES projects(id),
    parent_file_id UUID REFERENCES files(id),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_files_status ON files(status);
CREATE INDEX idx_files_project_id ON files(project_id);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);

CREATE TABLE file_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id),
    task_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    result JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_file_tasks_file_id ON file_tasks(file_id);

CREATE TABLE file_task_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_task_id UUID NOT NULL REFERENCES file_tasks(id),
    action VARCHAR(100) NOT NULL,
    detail JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_file_task_logs_file_task_id ON file_task_logs(file_task_id);

-- -------------------------------------------------------------
-- AI
-- -------------------------------------------------------------

CREATE TABLE ai_prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    template TEXT NOT NULL,
    model_id VARCHAR(100),
    max_tokens INT DEFAULT 4096,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    agent VARCHAR(50) NOT NULL,
    model_id VARCHAR(100) NOT NULL,
    input_tokens INT NOT NULL DEFAULT 0,
    output_tokens INT NOT NULL DEFAULT 0,
    latency_ms INT,
    prompt_template_id UUID REFERENCES ai_prompt_templates(id),
    conversation_id UUID REFERENCES conversations(id),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_logs_agent_created ON ai_usage_logs(agent, created_at);
CREATE INDEX idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);

-- -------------------------------------------------------------
-- 배치
-- -------------------------------------------------------------

CREATE TABLE batch_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    cron_expression VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    last_run_at TIMESTAMP,
    last_run_status VARCHAR(50),
    last_run_duration_ms INT,
    last_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE batch_job_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_job_id UUID NOT NULL REFERENCES batch_jobs(id),
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    duration_ms INT,
    result JSONB,
    error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_batch_job_histories_job_started ON batch_job_histories(batch_job_id, started_at);

-- -------------------------------------------------------------
-- ClickUp 연동
-- -------------------------------------------------------------

CREATE TABLE clickup_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    direction VARCHAR(10) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    clickup_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_clickup_sync_logs_entity ON clickup_sync_logs(entity_type, entity_id);
CREATE INDEX idx_clickup_sync_logs_created ON clickup_sync_logs(created_at);

-- -------------------------------------------------------------
-- 프로젝트 동기화
-- -------------------------------------------------------------

CREATE TABLE project_syncs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clickup_space_id VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    last_sync_at TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'SYNCED',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- DOCX 템플릿
-- -------------------------------------------------------------

CREATE TABLE docx_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    s3_key VARCHAR(500) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);
