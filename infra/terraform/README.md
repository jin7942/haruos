# Terraform — HaruOS 인프라

## 구조

```
terraform/
├── main.tf              # Provider, backend (S3), 데이터 소스
├── variables.tf         # 입력 변수
├── outputs.tf           # 출력값
├── vpc.tf               # VPC, 서브넷, IGW, NAT, 라우팅
├── ecs.tf               # ECS 클러스터, Fargate 서비스, ALB, SSM
├── rds.tf               # Aurora Serverless v2 (Console DB)
├── s3.tf                # S3 버킷 (파일 저장소)
├── ecr.tf               # ECR 리포지토리 (4개 앱)
├── iam.tf               # IAM 역할 (Task Role, Execution Role)
├── security-groups.tf   # 보안 그룹 (ALB, ECS, RDS)
└── modules/
    └── tenant/          # 테넌트별 독립 리소스 모듈
        ├── main.tf      # RDS + ECS 서비스 + ALB 규칙
        ├── variables.tf
        └── outputs.tf
```

## 사용법

```bash
# 초기화
terraform init

# 계획
terraform plan -var-file=prod.tfvars

# 적용
terraform apply -var-file=prod.tfvars
```

## 필수 변수

| 변수 | 설명 |
|------|------|
| `console_db_password` | Console DB 비밀번호 |
| `file_bucket_name` | S3 버킷 이름 (전역 고유) |

## 핵심 설계

- **테넌트별 독립 RDS**: `modules/tenant`로 Aurora Serverless v2 생성
- **ECS Fargate**: 서버리스 컨테이너 실행
- **Aurora Serverless v2**: Console DB, 테넌트 DB 모두 서버리스로 비용 최적화
- **STS AssumeRole**: 고객 AWS 계정 접근 (키 저장 안 함)
