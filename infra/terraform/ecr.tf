################################################################################
# ECR 리포지토리 (4개 앱)
################################################################################

locals {
  ecr_repositories = ["console-api", "console-web", "tenant-api", "tenant-web"]
}

resource "aws_ecr_repository" "apps" {
  for_each = toset(local.ecr_repositories)

  name                 = "${var.project}/${each.key}"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = var.environment != "prod"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = { Name = "${local.name_prefix}-${each.key}" }
}

# 오래된 이미지 자동 정리 (최근 10개 유지)
resource "aws_ecr_lifecycle_policy" "apps" {
  for_each   = aws_ecr_repository.apps
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "최근 10개 이미지만 유지"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
