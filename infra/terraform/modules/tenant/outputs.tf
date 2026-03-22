################################################################################
# 테넌트 모듈 — 출력값
################################################################################

output "rds_endpoint" {
  description = "테넌트 RDS 엔드포인트"
  value       = aws_rds_cluster.tenant.endpoint
}

output "rds_cluster_id" {
  description = "테넌트 RDS 클러스터 ID"
  value       = aws_rds_cluster.tenant.id
}

output "ecs_service_name" {
  description = "테넌트 ECS 서비스 이름"
  value       = aws_ecs_service.tenant.name
}

output "target_group_arn" {
  description = "테넌트 ALB Target Group ARN"
  value       = aws_lb_target_group.tenant.arn
}

output "ecs_security_group_id" {
  description = "테넌트 ECS 보안그룹 ID (격리 모드 시 전용 SG)"
  value       = local.ecs_security_group_id
}

output "rds_security_group_id" {
  description = "테넌트 RDS 보안그룹 ID (격리 모드 시 전용 SG)"
  value       = local.rds_security_group_id
}
