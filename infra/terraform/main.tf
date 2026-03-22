################################################################################
# HaruOS Infrastructure — Main
################################################################################

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "haruos-terraform-state"
    key            = "infra/terraform.tfstate"
    region         = "ap-northeast-2"
    encrypt        = true
    dynamodb_table = "haruos-terraform-lock"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(var.tags, {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    })
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  name_prefix        = "${var.project}-${var.environment}"
  account_id         = data.aws_caller_identity.current.account_id
  region             = data.aws_region.current.name
  availability_zones = length(var.availability_zones) > 0 ? var.availability_zones : lookup(var.region_az_map, var.aws_region, ["${var.aws_region}a", "${var.aws_region}b"])
}
