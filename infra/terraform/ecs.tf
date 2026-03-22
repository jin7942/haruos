################################################################################
# ECS Cluster, ALB, 서비스, 태스크 정의
################################################################################

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${local.name_prefix}"
  retention_in_days = 30
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ALB
resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = { Name = "${local.name_prefix}-alb" }
}

# ALB Target Group — Console API
resource "aws_lb_target_group" "console_api" {
  name        = "${local.name_prefix}-api-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }
}

# ALB Target Group — Console Web
resource "aws_lb_target_group" "console_web" {
  name        = "${local.name_prefix}-web-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
  }
}

# ALB Listener (HTTP → 80)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.console_web.arn
  }
}

# API 라우팅 규칙: api.haruos.app → Console API
resource "aws_lb_listener_rule" "console_api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.console_api.arn
  }

  condition {
    host_header {
      values = ["api.${var.domain_name}"]
    }
  }
}

# ECS Task Definition — Console API
resource "aws_ecs_task_definition" "console_api" {
  family                   = "${local.name_prefix}-console-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.console_api_cpu
  memory                   = var.console_api_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "console-api"
    image     = "${aws_ecr_repository.apps["console-api"].repository_url}:latest"
    essential = true

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = var.environment },
      { name = "DB_HOST", value = aws_rds_cluster.console.endpoint },
      { name = "DB_PORT", value = "5432" },
      { name = "DB_DATABASE", value = var.console_db_name },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "S3_BUCKET", value = aws_s3_bucket.files.id },
    ]

    secrets = [
      { name = "DB_USERNAME", valueFrom = "${aws_ssm_parameter.db_username.arn}" },
      { name = "DB_PASSWORD", valueFrom = "${aws_ssm_parameter.db_password.arn}" },
      { name = "JWT_SECRET", valueFrom = "${aws_ssm_parameter.jwt_secret.arn}" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
        "awslogs-region"        = local.region
        "awslogs-stream-prefix" = "console-api"
      }
    }
  }])
}

# ECS Task Definition — Console Web
resource "aws_ecs_task_definition" "console_web" {
  family                   = "${local.name_prefix}-console-web"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.console_web_cpu
  memory                   = var.console_web_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "console-web"
    image     = "${aws_ecr_repository.apps["console-web"].repository_url}:latest"
    essential = true

    portMappings = [{
      containerPort = 80
      protocol      = "tcp"
    }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
        "awslogs-region"        = local.region
        "awslogs-stream-prefix" = "console-web"
      }
    }
  }])
}

# ECS Service — Console API
resource "aws_ecs_service" "console_api" {
  name            = "${local.name_prefix}-console-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.console_api.arn
  desired_count   = var.console_api_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.console_api.arn
    container_name   = "console-api"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.http]
}

# ECS Service — Console Web
resource "aws_ecs_service" "console_web" {
  name            = "${local.name_prefix}-console-web"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.console_web.arn
  desired_count   = var.console_web_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.console_web.arn
    container_name   = "console-web"
    container_port   = 80
  }

  depends_on = [aws_lb_listener.http]
}

# SSM Parameters (시크릿 저장)
resource "aws_ssm_parameter" "db_username" {
  name  = "/${local.name_prefix}/db/username"
  type  = "SecureString"
  value = var.console_db_username
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/${local.name_prefix}/db/password"
  type  = "SecureString"
  value = var.console_db_password
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/${local.name_prefix}/jwt/secret"
  type  = "SecureString"
  value = "CHANGE_ME_ON_FIRST_DEPLOY"

  lifecycle {
    ignore_changes = [value]
  }
}
