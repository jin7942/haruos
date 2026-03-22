################################################################################
# RDS PostgreSQL — Console DB
# 테넌트별 독립 RDS는 테넌트 모듈(modules/tenant)에서 생성
################################################################################

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "${local.name_prefix}-db-subnet" }
}

resource "aws_rds_cluster" "console" {
  cluster_identifier = "${local.name_prefix}-console"
  engine             = "aurora-postgresql"
  engine_version     = "16.4"
  engine_mode        = "provisioned"

  database_name   = var.console_db_name
  master_username = var.console_db_username
  master_password = var.console_db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  storage_encrypted = true
  deletion_protection = var.environment == "prod"

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 2.0
  }

  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${local.name_prefix}-console-final" : null

  tags = { Name = "${local.name_prefix}-console-db" }
}

resource "aws_rds_cluster_instance" "console" {
  identifier         = "${local.name_prefix}-console-1"
  cluster_identifier = aws_rds_cluster.console.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.console.engine
  engine_version     = aws_rds_cluster.console.engine_version

  tags = { Name = "${local.name_prefix}-console-db-1" }
}
