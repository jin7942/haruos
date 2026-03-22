# CloudFormation — Cross-Account Trust Role

## 목적

사용자가 자기 AWS 계정에서 `trust-role.yaml` 스택을 생성하면, HaruOS 플랫폼이 STS AssumeRole로 해당 계정의 리소스에 접근할 수 있다.

## 사용법

```bash
aws cloudformation create-stack \
  --stack-name HaruOS-TrustRole \
  --template-body file://trust-role.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=HaruOSAccountId,ParameterValue=123456789012 \
    ParameterKey=ExternalId,ParameterValue=<테넌트-external-id>
```

## 파라미터

| 파라미터 | 설명 |
|----------|------|
| `HaruOSAccountId` | HaruOS 플랫폼 AWS 계정 ID |
| `ExternalId` | HaruOS에서 발급한 External ID (CSRF 방지) |
| `RoleName` | IAM 역할 이름 (기본: HaruOS-TrustRole) |

## 출력값

- `RoleArn`: HaruOS에 등록할 Role ARN
- `ExternalId`: 사용된 External ID

## 보안

- External ID로 Confused Deputy 공격 방지
- 최소 권한 원칙 적용 (ECS 읽기, CloudWatch, Cost Explorer, RDS 읽기, S3)
- 키 저장 없음 — STS AssumeRole만 사용
