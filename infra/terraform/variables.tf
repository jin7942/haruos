################################################################################
# HaruOS Terraform Variables
################################################################################

variable "project" {
  description = "프로젝트 이름"
  type        = string
  default     = "haruos"
}

variable "environment" {
  description = "배포 환경 (dev, staging, prod)"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment는 dev, staging, prod 중 하나여야 합니다."
  }
}

variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"
}

# VPC
variable "vpc_cidr" {
  description = "VPC CIDR 블록"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "사용할 가용 영역 목록"
  type        = list(string)
  default     = ["ap-northeast-2a", "ap-northeast-2c"]
}

variable "public_subnet_cidrs" {
  description = "퍼블릭 서브넷 CIDR 목록"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "프라이빗 서브넷 CIDR 목록"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

# RDS (Console DB)
variable "console_db_instance_class" {
  description = "Console DB 인스턴스 클래스"
  type        = string
  default     = "db.t4g.micro"
}

variable "console_db_name" {
  description = "Console DB 이름"
  type        = string
  default     = "haruos_console"
}

variable "console_db_username" {
  description = "Console DB 마스터 사용자명"
  type        = string
  default     = "haruos"
  sensitive   = true
}

variable "console_db_password" {
  description = "Console DB 마스터 비밀번호"
  type        = string
  sensitive   = true
}

# ECS
variable "console_api_cpu" {
  description = "Console API 태스크 CPU (단위: vCPU units)"
  type        = number
  default     = 256
}

variable "console_api_memory" {
  description = "Console API 태스크 메모리 (단위: MiB)"
  type        = number
  default     = 512
}

variable "console_api_desired_count" {
  description = "Console API 서비스 desired count"
  type        = number
  default     = 1
}

variable "console_web_cpu" {
  description = "Console Web 태스크 CPU"
  type        = number
  default     = 256
}

variable "console_web_memory" {
  description = "Console Web 태스크 메모리 (MiB)"
  type        = number
  default     = 512
}

variable "console_web_desired_count" {
  description = "Console Web 서비스 desired count"
  type        = number
  default     = 1
}

# S3
variable "file_bucket_name" {
  description = "파일 저장용 S3 버킷 이름 (전역 고유)"
  type        = string
}

# 도메인
variable "domain_name" {
  description = "기본 도메인 (예: haruos.app)"
  type        = string
  default     = "haruos.app"
}

# 태그
variable "tags" {
  description = "공통 태그"
  type        = map(string)
  default     = {}
}
