################################################################################
# 테넌트 모듈 — 변수
# 테넌트별 독립 RDS + ECS 서비스를 생성한다.
################################################################################

variable "tenant_id" {
  description = "테넌트 UUID"
  type        = string
}

variable "tenant_slug" {
  description = "테넌트 슬러그 (리소스 네이밍용)"
  type        = string
}

variable "project" {
  description = "프로젝트 이름"
  type        = string
}

variable "environment" {
  description = "배포 환경"
  type        = string
}

variable "aws_region" {
  description = "AWS 리전"
  type        = string
}

# 네트워크
variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "프라이빗 서브넷 ID 목록"
  type        = list(string)
}

variable "db_subnet_group_name" {
  description = "RDS 서브넷 그룹 이름"
  type        = string
}

variable "rds_security_group_id" {
  description = "RDS 보안 그룹 ID"
  type        = string
}

variable "ecs_security_group_id" {
  description = "ECS 태스크 보안 그룹 ID"
  type        = string
}

# ECS
variable "ecs_cluster_id" {
  description = "ECS 클러스터 ID"
  type        = string
}

variable "execution_role_arn" {
  description = "ECS Execution Role ARN"
  type        = string
}

variable "task_role_arn" {
  description = "ECS Task Role ARN"
  type        = string
}

variable "ecr_tenant_api_url" {
  description = "Tenant API ECR 리포지토리 URL"
  type        = string
}

variable "ecr_tenant_web_url" {
  description = "Tenant Web ECR 리포지토리 URL"
  type        = string
}

variable "image_tag" {
  description = "배포할 이미지 태그"
  type        = string
  default     = "latest"
}

# ALB
variable "alb_listener_arn" {
  description = "ALB 리스너 ARN"
  type        = string
}

variable "alb_listener_rule_priority" {
  description = "ALB 리스너 규칙 우선순위"
  type        = number
}

# RDS
variable "db_instance_class" {
  description = "테넌트 RDS 인스턴스 클래스"
  type        = string
  default     = "db.serverless"
}

variable "db_password" {
  description = "테넌트 DB 비밀번호"
  type        = string
  sensitive   = true
}

# Log
variable "log_group_name" {
  description = "CloudWatch Log Group 이름"
  type        = string
}

# 도메인
variable "tenant_domain" {
  description = "테넌트 도메인 (예: acme.haruos.app)"
  type        = string
}

variable "task_cpu" {
  description = "태스크 CPU"
  type        = number
  default     = 256
}

variable "task_memory" {
  description = "태스크 메모리 (MiB)"
  type        = number
  default     = 512
}

# 보안그룹 격리
variable "enable_sg_isolation" {
  description = "테넌트별 전용 보안그룹 사용 여부 (true: 테넌트 전용 SG 생성, false: 공유 SG 사용)"
  type        = bool
  default     = true
}

variable "alb_security_group_id" {
  description = "ALB 보안 그룹 ID (테넌트 전용 SG 생성 시 인바운드 소스로 사용)"
  type        = string
  default     = ""
}

# S3
variable "file_bucket_name" {
  description = "파일 저장용 S3 버킷 이름 (테넌트 prefix 격리에 사용)"
  type        = string
  default     = ""
}

variable "file_bucket_arn" {
  description = "파일 저장용 S3 버킷 ARN"
  type        = string
  default     = ""
}
