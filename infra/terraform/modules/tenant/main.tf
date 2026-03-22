################################################################################
# 테넌트 모듈 — 테넌트별 독립 RDS + ECS 서비스
################################################################################

locals {
  name_prefix = "${var.project}-${var.environment}-${var.tenant_slug}"
  db_name     = "haruos_tenant"
  db_username = "haruos"
}

# ─── 테넌트 전용 보안그룹 (격리 옵션) ────────────────────────────────────────

resource "aws_security_group" "tenant_ecs" {
  count       = var.enable_sg_isolation ? 1 : 0
  name_prefix = "${local.name_prefix}-ecs-"
  vpc_id      = var.vpc_id
  description = "Tenant ${var.tenant_slug} ECS Tasks - ALB에서만 인바운드"

  ingress {
    description     = "From ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [var.alb_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name     = "${local.name_prefix}-ecs-sg"
    TenantId = var.tenant_id
  }

  lifecycle { create_before_destroy = true }
}

resource "aws_security_group" "tenant_rds" {
  count       = var.enable_sg_isolation ? 1 : 0
  name_prefix = "${local.name_prefix}-rds-"
  vpc_id      = var.vpc_id
  description = "Tenant ${var.tenant_slug} RDS - 해당 테넌트 ECS에서만 접근"

  ingress {
    description     = "PostgreSQL from tenant ECS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.tenant_ecs[0].id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name     = "${local.name_prefix}-rds-sg"
    TenantId = var.tenant_id
  }

  lifecycle { create_before_destroy = true }
}

locals {
  ecs_security_group_id = var.enable_sg_isolation ? aws_security_group.tenant_ecs[0].id : var.ecs_security_group_id
  rds_security_group_id = var.enable_sg_isolation ? aws_security_group.tenant_rds[0].id : var.rds_security_group_id
}

# ─── S3 버킷 정책: 테넌트 prefix 격리 ──────────────────────────────────────

resource "aws_s3_bucket_policy" "tenant_prefix" {
  count  = var.file_bucket_name != "" ? 1 : 0
  bucket = var.file_bucket_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "TenantPrefixAccess-${var.tenant_id}"
        Effect    = "Allow"
        Principal = { AWS = var.task_role_arn }
        Action    = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource  = "${var.file_bucket_arn}/tenants/${var.tenant_id}/*"
      },
      {
        Sid       = "TenantPrefixList-${var.tenant_id}"
        Effect    = "Allow"
        Principal = { AWS = var.task_role_arn }
        Action    = ["s3:ListBucket"]
        Resource  = var.file_bucket_arn
        Condition = {
          StringLike = {
            "s3:prefix" = ["tenants/${var.tenant_id}/*"]
          }
        }
      }
    ]
  })
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
  vpc_security_group_ids = [local.rds_security_group_id]

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
    security_groups  = [local.ecs_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.tenant.arn
    container_name   = "tenant-app"
    container_port   = 3000
  }

  tags = { TenantId = var.tenant_id }
}
