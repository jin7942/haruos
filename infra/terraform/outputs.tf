################################################################################
# Outputs
################################################################################

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "퍼블릭 서브넷 ID 목록"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "프라이빗 서브넷 ID 목록"
  value       = aws_subnet.private[*].id
}

output "ecs_cluster_name" {
  description = "ECS 클러스터 이름"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ECS 클러스터 ARN"
  value       = aws_ecs_cluster.main.arn
}

output "alb_dns_name" {
  description = "ALB DNS 이름"
  value       = aws_lb.main.dns_name
}

output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.main.arn
}

output "console_db_endpoint" {
  description = "Console DB 엔드포인트"
  value       = aws_rds_cluster.console.endpoint
}

output "console_db_reader_endpoint" {
  description = "Console DB 읽기 전용 엔드포인트"
  value       = aws_rds_cluster.console.reader_endpoint
}

output "ecr_repository_urls" {
  description = "ECR 리포지토리 URL 맵"
  value       = { for k, v in aws_ecr_repository.apps : k => v.repository_url }
}

output "s3_bucket_name" {
  description = "파일 저장소 S3 버킷 이름"
  value       = aws_s3_bucket.files.id
}

output "db_subnet_group_name" {
  description = "RDS 서브넷 그룹 이름 (테넌트 모듈에서 참조)"
  value       = aws_db_subnet_group.main.name
}

output "rds_security_group_id" {
  description = "RDS 보안 그룹 ID (테넌트 모듈에서 참조)"
  value       = aws_security_group.rds.id
}

output "ecs_task_role_arn" {
  description = "ECS Task Role ARN"
  value       = aws_iam_role.ecs_task.arn
}

output "ecs_execution_role_arn" {
  description = "ECS Execution Role ARN"
  value       = aws_iam_role.ecs_execution.arn
}
