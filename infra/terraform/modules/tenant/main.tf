################################################################################
# 테넌트 모듈 — 테넌트별 독립 RDS + ECS 서비스
################################################################################

locals {
  name_prefix = "${var.project}-${var.environment}-${var.tenant_slug}"
  db_name     = "haruos_tenant"
  db_username = "haruos"
}

# ─── 테넌트 전용 RDS (Aurora Serverless v2) ──────────────────────────────────

resource "aws_rds_cluster" "tenant" {
  cluster_identifier = "${local.name_prefix}-db"
  engine             = "aurora-postgresql"
  engine_version     = "16.4"
  engine_mode        = "provisioned"

  database_name   = local.db_name
  master_username = local.db_username
  master_password = var.db_password

  db_subnet_group_name   = var.db_subnet_group_name
  vpc_security_group_ids = [var.rds_security_group_id]

  storage_encrypted   = true
  deletion_protection = var.environment == "prod"

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 2.0
  }

  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${local.name_prefix}-final" : null

  tags = {
    Name     = "${local.name_prefix}-db"
    TenantId = var.tenant_id
  }
}

resource "aws_rds_cluster_instance" "tenant" {
  identifier         = "${local.name_prefix}-db-1"
  cluster_identifier = aws_rds_cluster.tenant.id
  instance_class     = var.db_instance_class
  engine             = aws_rds_cluster.tenant.engine
  engine_version     = aws_rds_cluster.tenant.engine_version

  tags = {
    Name     = "${local.name_prefix}-db-1"
    TenantId = var.tenant_id
  }
}

# ─── SSM Parameter (DB 비밀번호) ─────────────────────────────────────────────

resource "aws_ssm_parameter" "tenant_db_password" {
  name  = "/${var.project}-${var.environment}/tenant/${var.tenant_slug}/db/password"
  type  = "SecureString"
  value = var.db_password
}

# ─── ALB Target Group ────────────────────────────────────────────────────────

resource "aws_lb_target_group" "tenant" {
  name        = "${local.name_prefix}-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }

  tags = { TenantId = var.tenant_id }
}

# ALB 리스너 규칙: 테넌트 도메인 → 테넌트 서비스
resource "aws_lb_listener_rule" "tenant" {
  listener_arn = var.alb_listener_arn
  priority     = var.alb_listener_rule_priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tenant.arn
  }

  condition {
    host_header {
      values = [var.tenant_domain]
    }
  }
}

# ─── ECS Task Definition (Tenant: API + Web 동일 컨테이너) ───────────────────

resource "aws_ecs_task_definition" "tenant" {
  family                   = "${local.name_prefix}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([{
    name      = "tenant-app"
    image     = "${var.ecr_tenant_api_url}:${var.image_tag}"
    essential = true

    portMappings = [
      { containerPort = 3000, protocol = "tcp" },
      { containerPort = 80, protocol = "tcp" },
    ]

    environment = [
      { name = "NODE_ENV", value = var.environment },
      { name = "DB_HOST", value = aws_rds_cluster.tenant.endpoint },
      { name = "DB_PORT", value = "5432" },
      { name = "DB_DATABASE", value = local.db_name },
      { name = "DB_USERNAME", value = local.db_username },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "TENANT_ID", value = var.tenant_id },
    ]

    secrets = [
      { name = "DB_PASSWORD", valueFrom = aws_ssm_parameter.tenant_db_password.arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = var.log_group_name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "tenant-${var.tenant_slug}"
      }
    }
  }])

  tags = { TenantId = var.tenant_id }
}

# ─── ECS Service ─────────────────────────────────────────────────────────────

resource "aws_ecs_service" "tenant" {
  name            = "${local.name_prefix}"
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.tenant.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.tenant.arn
    container_name   = "tenant-app"
    container_port   = 3000
  }

  tags = { TenantId = var.tenant_id }
}
