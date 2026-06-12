# HaruOS

> 던져놓으면 알아서 하는 업무 비서

AI 기반 통합 업무 관리 SaaS. 자연어 대화와 자동 배치 처리로 프로젝트, 일정, 문서, 파일을 관리한다.

## 아키텍처

```
                        haruos.app (관리 콘솔)
                        ┌─────────────────────────────────┐
                        │  console-web    console-api      │
                        │  (React)        (NestJS)         │
                        │       │              │           │
                        │       └──── REST ────┘           │
                        │              │                   │
                        │         haruos_console (PG)      │
                        └─────────────────────────────────┘
                                       │
                          프로비저닝 (CloudFormation + Ansible)
                                       │
                                       ▼
                        {tenant}.haruos.app (테넌트 앱)
                        ┌─────────────────────────────────┐
                        │  tenant-web     tenant-api       │
                        │  (React)        (NestJS)         │
                        │       │              │           │
                        │       └──── REST ────┘           │
                        │              │                   │
                        │         haruos_tenant (PG)       │
                        │              │                   │
                        │     ┌────────┼────────┐          │
                        │  Bedrock  ClickUp  S3/Storage    │
                        └─────────────────────────────────┘
```

- **console** -- 관리자가 테넌트를 생성/관리/모니터링하는 콘솔
- **tenant** -- 사용자가 실제 업무를 수행하는 AI 비서 앱

## 기술 스택

| 계층 | 기술 |
| --- | --- |
| 프론트엔드 | React 18, TanStack Query, Tailwind CSS, Vite |
| 백엔드 | NestJS 11, TypeORM, class-validator |
| 데이터베이스 | PostgreSQL 16 + pgvector |
| AI | AWS Bedrock (Claude Sonnet / Haiku fallback, Titan Embedding) |
| 인프라 | AWS (ECS, RDS, S3, CloudFormation), Terraform, Ansible |
| 빌드 | pnpm workspaces, Turborepo |
| 마이그레이션 | Flyway |

## 프로젝트 구조

```
haruos/
├── apps/
│   ├── console-api/        # 관리 콘솔 API (NestJS)
│   ├── console-web/        # 관리 콘솔 프론트엔드 (React)
│   ├── tenant-api/         # 테넌트 API (NestJS)
│   └── tenant-web/         # 테넌트 프론트엔드 (React)
├── packages/
│   ├── shared-types/       # 공유 타입 정의
│   ├── shared-utils/       # 공유 유틸리티
│   └── shared-ui/          # 공유 UI 컴포넌트
├── infra/
│   ├── docker/             # Docker Compose + Dockerfile
│   ├── flyway/             # DB 마이그레이션 (console, tenant)
│   ├── terraform/          # AWS 인프라 정의
│   ├── cloudformation/     # 테넌트 프로비저닝 템플릿
│   ├── ansible/            # 서버 설정 자동화
│   └── scripts/            # 운영 스크립트
├── docs/                   # 기획안, 설계 문서
├── decisions/              # 의사결정 기록 (RFC 논의 → ADR 확정)
├── turbo.json              # Turborepo 설정
└── pnpm-workspace.yaml     # pnpm 워크스페이스 설정
```

## 시작하기

### Prerequisites

- Node.js >= 22
- pnpm >= 10
- Docker (PostgreSQL + pgvector 실행용)

### 설치

```bash
# 저장소 클론
git clone <repository-url>
cd haruos

# 의존성 설치
pnpm install
```

### 개발 서버 실행

루트 `Makefile`로 단축한다 (`make help`로 전체 목록). 단일 nginx 게이트웨이가
Host 헤더로 console/tenant를 분기하며, 개별 앱 포트는 외부에 노출하지 않는다.

**방법 1: Docker (권장, 협업 표준)**

외부 인프라 의존이 없어 클론 후 바로 동작한다.

```bash
make env     # .env 생성 (최초 1회)
make up      # DB + API + 프론트 + 게이트웨이 기동
make logs    # 로그
make down    # 종료
```

접속 (hosts 등록 불필요 — `*.localhost`는 127.0.0.1 자동 해석):

| 앱 | 주소 |
| --- | --- |
| 관리 콘솔 | http://console.haruos.localhost |
| 테넌트 앱 | http://tenant.haruos.localhost |

> 게이트웨이는 `HTTP_PORT`(기본 80)로 노출. 80이 막혀 있으면 `.env`에서 바꾼다.
> 공용 nginx-proxy가 있는 메인 개발 머신은 `make up-internal`(→ `*.haruos.internal`) 사용.

**방법 2: 로컬 실행 (DB만 Docker)**

```bash
make db                 # DB + Flyway 마이그레이션만 Docker 로
pnpm dev                # 전체 앱 로컬 실행 (또는 pnpm dev:console-api 등 개별)
```

자세한 내용: [docs/guides/local-development.md](docs/guides/local-development.md)

### 테스트

```bash
# 전체 테스트
pnpm test

# 앱별 테스트
cd apps/console-api && pnpm test
cd apps/tenant-api && pnpm test

# E2E 테스트 (DB 필요)
cd apps/console-api && pnpm test:e2e
cd apps/tenant-api && pnpm test:e2e
```

## 환경변수

**단일 진실 공급원(SSOT)은 루트 `.env` 하나**다. 앱별 `.env`는 두지 않는다.
`cp .env.example .env`(또는 `make env`) 후 값을 채운다. 로딩 경로:

- 로컬(`pnpm dev:*`): `dotenv-cli`가 루트 `.env` 주입
- Docker: compose가 `--env-file .env` 로 보간·주입
- 프론트(Vite): `loadEnv`가 루트 `.env`에서 `VITE_*` 로드

> 앱별로 다른 값(DB 이름, 포트)은 각 앱 기본값을 따르고, 공통 비밀·설정만 `.env`에 둔다.

### console-api 가 사용하는 주요 변수

| 변수 | 설명 | 기본값 |
| --- | --- | --- |
| `PORT` | 서버 포트 | `3000` |
| `DB_HOST` | PostgreSQL 호스트 | `localhost` |
| `DB_PORT` | PostgreSQL 포트 | `5432` |
| `DB_USERNAME` | DB 사용자 | `haruos` |
| `DB_PASSWORD` | DB 비밀번호 | `haruos` |
| `DB_DATABASE` | DB 이름 | `haruos_console` |
| `JWT_SECRET` | JWT 서명 키 | - |
| `JWT_ACCESS_EXPIRY` | 액세스 토큰 만료 | `15m` |
| `JWT_REFRESH_EXPIRY` | 리프레시 토큰 만료 | `7d` |
| `CORS_ORIGIN` | CORS 허용 오리진 | `http://console.haruos.localhost` |

### tenant-api 가 추가로 사용하는 변수

| 변수 | 설명 | 기본값 |
| --- | --- | --- |
| `AWS_REGION` | AWS 리전 | `ap-northeast-2` |
| `S3_BUCKET_NAME` | S3 버킷 이름 | - |
| `S3_INBOX_PREFIX` | S3 인박스 접두사 | `inbox/` |
| `BEDROCK_PRIMARY_MODEL_ID` | Bedrock 기본 모델 | Claude Sonnet |
| `BEDROCK_FALLBACK_MODEL_ID` | Bedrock 폴백 모델 | Claude Haiku |
| `BEDROCK_EMBEDDING_MODEL_ID` | 임베딩 모델 | Titan Embed v2 |
| `BEDROCK_MAX_TOKENS` | 최대 토큰 수 | `4096` |
| `CLICKUP_API_TOKEN` | ClickUp API 토큰 | - |
| `CLICKUP_TEAM_ID` | ClickUp 팀 ID | - |
| `CLICKUP_WEBHOOK_SECRET` | ClickUp 웹훅 시크릿 | - |

## 라이센스

[BSL 1.1](LICENSE) (Business Source License)

- 소스 코드 공개. 셀프 호스팅, 내부 사용, 학습 자유.
- 제3자 호스팅 서비스로 제공 시 상업 라이센스 필요.
- 공개 후 4년 뒤 Apache 2.0 자동 전환.

Copyright (c) 2026 JLab
