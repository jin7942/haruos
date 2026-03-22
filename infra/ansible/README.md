# Ansible — 테넌트 배포/관리 플레이북

## 구조

```
ansible/
├── ansible.cfg
├── inventory/
│   └── dynamic.yml       # localhost (ECS Fargate이므로 SSH 불필요)
└── playbooks/
    ├── setup-tenant.yml   # 테넌트 초기 설정
    └── update-tenant.yml  # 테넌트 업데이트
```

## 플레이북

### setup-tenant.yml
테넌트 최초 생성 시 실행. Terraform 인프라 생성 → Flyway 마이그레이션 → ECS 서비스 시작.

```bash
TENANT_SLUG=acme TENANT_ID=uuid-here ansible-playbook playbooks/setup-tenant.yml
```

### update-tenant.yml
새 이미지 배포 또는 DB 마이그레이션 실행.

```bash
# 이미지만 업데이트
TENANT_SLUG=acme TENANT_ID=uuid-here ansible-playbook playbooks/update-tenant.yml

# 마이그레이션 포함
TENANT_SLUG=acme TENANT_ID=uuid-here RUN_MIGRATION=true ansible-playbook playbooks/update-tenant.yml
```

## 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `TENANT_SLUG` | O | 테넌트 슬러그 |
| `TENANT_ID` | O | 테넌트 UUID |
| `AWS_REGION` | X | AWS 리전 (기본: ap-northeast-2) |
| `ENVIRONMENT` | X | 환경 (기본: prod) |
| `IMAGE_TAG` | X | 배포 이미지 태그 (기본: latest) |
| `RUN_MIGRATION` | X | 마이그레이션 실행 여부 (기본: false) |
