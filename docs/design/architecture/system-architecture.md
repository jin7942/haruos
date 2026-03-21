# HaruOS 시스템 아키텍처

| 버전 | 변경내용 | 작성자 | 수정일 |
| --- | --- | --- | --- |
| v1.3 | API 문서화 전략 추가 | 김진범 | 2026-03-21 |
| v1.2 | 스키마 관리 Flyway 추가 | 김진범 | 2026-03-21 |
| v1.1 | 애착개발패턴 적용, Nginx 확정, 공통 패턴 추가 | 김진범 | 2026-03-21 |
| v1.0 | 초기 작성 | 김진범 | 2026-03-21 |

---

## 1. 시스템 전체 구조

```
┌─ 자체 서버 (Docker Compose) ──────────────────────────────────────────┐
│                                                                       │
│  ┌─ Nginx (Reverse Proxy) ──────────────────────────────────────┐    │
│  │  haruos.app → Console FE                                     │    │
│  │  api.haruos.app → Console BE                                 │    │
│  └──────────────────────────────────────────────────────────────┘    │
│        │                      │                                      │
│  ┌─────▼──────┐    ┌─────────▼──────────────────────────────┐       │
│  │ Console FE │    │ Console BE (NestJS)                     │       │
│  │ Vite+React │    │                                         │       │
│  │ (정적 빌드 │    │  Auth · Tenant · AWS · Provisioner      │       │
│  │  Nginx서빙)│    │  Domain · Monitoring · Billing          │       │
│  └────────────┘    │                                         │       │
│                    │  Terraform/Ansible 실행 ────────────┐   │       │
│                    └──────────┬──────────────────────────┼───┘       │
│                               │                          │           │
│                    ┌──────────▼──────┐                   │           │
│                    │ Console DB      │                   │           │
│                    │ PostgreSQL      │                   │           │
│                    └─────────────────┘                   │           │
└──────────────────────────────────────────────────────────┼───────────┘
                                                           │
                          STS AssumeRole                   │
                                                           ▼
┌─ 사용자 AWS 계정 (테넌트 인프라) ────────────────────────────────────┐
│                                                                       │
│  ┌─ ALB ──────────────────────────────────────────────────────┐      │
│  │  {tenant}.haruos.app 또는 커스텀 도메인                     │      │
│  └──────────┬─────────────────────────────────────────────────┘      │
│             │                                                         │
│  ┌──────────▼──────────────────────────────────────────────┐         │
│  │ ECS Fargate (Tenant App)                                 │         │
│  │                                                          │         │
│  │  ┌─ Frontend ──┐  ┌─ Backend (NestJS) ───────────────┐  │         │
│  │  │ Vite+React  │  │                                   │  │         │
│  │  │ (정적 빌드) │  │  Haru 오케스트레이터               │  │         │
│  │  └─────────────┘  │    ├── 의도 분석                   │  │         │
│  │                    │    ├── 계획 수립                   │  │         │
│  │                    │    └── 에이전트 라우팅             │  │         │
│  │                    │                                   │  │         │
│  │                    │  에이전트                          │  │         │
│  │                    │    ├── Project (ClickUp)           │  │         │
│  │                    │    ├── Schedule (ClickUp)          │  │         │
│  │                    │    ├── Document (Bedrock)          │  │         │
│  │                    │    ├── Knowledge (pgvector)        │  │         │
│  │                    │    └── File (S3)                   │  │         │
│  │                    │                                   │  │         │
│  │                    │  엔진                              │  │         │
│  │                    │    ├── 배치 (EventBridge cron)     │  │         │
│  │                    │    └── 워치독 (S3 Event, Webhook)  │  │         │
│  │                    │                                   │  │         │
│  │                    │  공통                              │  │         │
│  │                    │    ├── Auth (OTP + JWT)            │  │         │
│  │                    │    ├── AI Gateway (Bedrock)        │  │         │
│  │                    │    └── Storage (S3)                │  │         │
│  │                    └───────────────────────────────────┘  │         │
│  └──────────────────────────────────────────────────────────┘         │
│       │              │              │              │                   │
│  ┌────▼────┐  ┌──────▼──────┐  ┌───▼───┐  ┌──────▼──────┐           │
│  │   RDS   │  │  Bedrock    │  │  S3   │  │ EventBridge │           │
│  │ PG 16   │  │  Claude     │  │       │  │ CloudWatch  │           │
│  │+pgvector│  │  Titan Emb  │  │       │  │             │           │
│  └─────────┘  └─────────────┘  └───────┘  └─────────────┘           │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 2. 관리 콘솔 아키텍처

### 2.1 컨테이너 구성 (Docker Compose)

```yaml
services:
  nginx:        # 리버스 프록시 + FE 정적 파일 서빙
  console-api:  # NestJS 백엔드
  console-db:   # PostgreSQL
```

### 2.2 모듈 구조

```
Console BE (NestJS)
├── auth/              # 회원가입, 로그인, JWT
├── tenant/            # 테넌트 CRUD, 상태 관리
├── aws/               # CloudFormation, STS AssumeRole, 자격 검증
│   └── ports/         # aws-credential.port.ts
│   └── adapters/      # sts.adapter.ts
├── provisioner/       # Terraform + Ansible 오케스트레이션
│   └── ports/         # terraform.port.ts, ansible.port.ts, dns.port.ts
│   └── adapters/      # terraform.adapter.ts, ansible.adapter.ts,
│                        cloudflare.adapter.ts, route53.adapter.ts
├── domain/            # 도메인 관리 (서브도메인, 커스텀, DNS 전파)
├── monitoring/        # CloudWatch, Cost Explorer, AI 사용량
│   └── ports/         # metric-collector.port.ts, cost-collector.port.ts
│   └── adapters/      # cloudwatch.adapter.ts, cost-explorer.adapter.ts
├── billing/           # Stripe 연동 (P4)
│   └── ports/         # payment.port.ts
│   └── adapters/      # stripe.adapter.ts
└── common/
    ├── filters/       # GlobalExceptionFilter
    ├── interceptors/  # ApiResponse 래핑
    ├── guards/        # JwtAuthGuard
    └── vo/            # 공유 VO
```

**포트/어댑터 적용 기준**: 외부 시스템 연동이 있는 모듈만.
auth, tenant, domain은 단순 CRUD → Controller → Service → Repository.

### 2.3 관리 콘솔 DB 테이블 (개요)

| 영역 | 테이블 | 설명 |
| --- | --- | --- |
| 인증 | users | 콘솔 사용자 |
| 테넌트 | tenants | 프로젝트(테넌트) 정보 + 상태 |
| AWS | aws_credentials | Role ARN, 리전, 검증 상태 |
| 프로비저닝 | provisioning_logs | 단계별 로그 |
| 도메인 | domains | 서브도메인/커스텀 도메인 |
| 모니터링 | metrics | CloudWatch 메트릭 집계 |
| 모니터링 | cost_records | Cost Explorer 비용 데이터 |
| 모니터링 | ai_usage_records | Bedrock 토큰 사용량 |
| 모니터링 | alert_configs | 알림 설정 |
| 과금 | subscriptions | 구독 정보 (P4) |
| 공통 | code_groups, codes | 공통코드 |

---

## 3. 테넌트 앱 아키텍처

### 3.1 실행 트리거 (3가지)

```
사용자 입력 ──→ Haru 오케스트레이터 ──→ 에이전트 호출 ──→ 응답
EventBridge ──→ 배치 엔진 ──→ 에이전트 호출 ──→ 결과 저장/알림
S3 Event ─────→ 워치독 엔진 ──→ 파일 에이전트 ──→ 자동 처리
ClickUp 웹훅 ─→ 워치독 엔진 ──→ 프로젝트 에이전트 ──→ 동기화
```

### 3.2 모듈 구조

```
Tenant BE (NestJS)
├── haru/                          # 오케스트레이터
│   ├── orchestrator/              # 의도 분석, 계획, 라우팅
│   ├── context/                   # 대화 맥락 관리
│   ├── batch/                     # 배치 엔진 (EventBridge 트리거)
│   │   └── jobs/                  # daily-briefing, clickup-sync, ...
│   └── watchdog/                  # 워치독 엔진 (S3 Event, 웹훅)
│
├── agents/                        # 전문 에이전트
│   ├── project/                   # ClickUp 연동
│   ├── schedule/                  # ClickUp 연동
│   ├── document/                  # Bedrock, pandoc
│   ├── knowledge/                 # Bedrock Titan, pgvector
│   └── file/                      # S3
│
├── core/                          # 공통 기반
│   ├── auth/                      # OTP + JWT
│   ├── ai-gateway/                # Bedrock 멀티모델 fallback
│   │   └── ports/                 # ai-gateway.port.ts
│   │   └── adapters/              # bedrock.adapter.ts
│   ├── storage/                   # S3
│   │   └── ports/                 # storage.port.ts
│   │   └── adapters/              # s3.adapter.ts
│   ├── doc-engine/                # MD → DOCX (pandoc)
│   └── clickup/                   # ClickUp API
│       └── ports/                 # clickup.port.ts
│       └── adapters/              # clickup.adapter.ts
│
└── common/
    ├── filters/
    ├── interceptors/
    ├── guards/
    └── vo/
```

### 3.3 에이전트 흐름

```
사용자: "이 녹취록으로 회의록 만들어줘"
                │
                ▼
  ┌─── Haru 오케스트레이터 ───┐
  │  1. 의도 분석              │
  │     → "문서 생성 (회의록)" │
  │  2. 계획 수립              │
  │     → Document Agent 호출  │
  │     → 결과 반환            │
  └────────────┬───────────────┘
               │
               ▼
  ┌─── Document Agent ────────┐
  │  1. 녹취록 텍스트 파싱     │
  │  2. Bedrock → 회의록 생성  │
  │  3. Action Item 추출       │
  │  4. DB 저장                │
  │  5. ClickUp 작업 생성      │
  └────────────┬───────────────┘
               │
               ▼
  ┌─── 응답 조합 ─────────────┐
  │  회의록 + Action Item 목록 │
  │  SSE 스트리밍으로 전달     │
  └────────────────────────────┘
```

---

## 4. 통신 구조

### 4.1 관리 콘솔 ↔ 사용자 AWS

```
Console BE ──STS AssumeRole──→ 사용자 AWS IAM Role
             (임시 자격 1시간)
                │
                ├── Terraform 실행 (프로비저닝, 사양 변경)
                ├── CloudWatch API (메트릭 수집)
                ├── Cost Explorer API (비용 수집)
                └── ECS API (앱 업데이트, 상태 확인)
```

### 4.2 관리 콘솔 ↔ 테넌트 앱

```
관리 콘솔은 테넌트 앱과 직접 통신하지 않는다.

- 모니터링: 사용자 AWS API를 직접 호출 (CloudWatch, Cost Explorer)
- AI 사용량: 테넌트 DB에 직접 쿼리 (STS → RDS 접속)
- 앱 업데이트: ECS API로 Task Definition 교체
- 헬스체크: 테넌트 ALB 엔드포인트 HTTP 호출
```

### 4.3 프로토콜

| 통신 | 프로토콜 | 용도 |
| --- | --- | --- |
| FE ↔ BE | REST (HTTP/JSON) | CRUD, 일반 요청 |
| FE ← BE | SSE | 프로비저닝 진행, Haru 대화 스트리밍 |
| FE ↔ BE | WebSocket | 실시간 알림 (P2) |
| BE → AWS | AWS SDK | STS, CloudWatch, Cost Explorer, ECS |
| BE → ClickUp | REST | ClickUp API 연동 |
| BE → Bedrock | AWS SDK | AI 모델 호출 |
| BE → Cloudflare | REST | DNS/SSL/CDN 설정 |

---

## 5. 배포 구조

### 5.1 자체 서버 (관리 콘솔)

```
docker-compose.yml
├── nginx          (port 80, 443)
│   ├── haruos.app → /usr/share/nginx/html (FE 정적 빌드)
│   └── api.haruos.app → proxy_pass console-api:3000
├── console-api    (port 3000, 내부)
└── console-db     (port 5432, 내부)
```

- SSL: Let's Encrypt (certbot) 또는 Cloudflare Proxy
- 배포: GitHub Actions → Docker 이미지 빌드 → 서버 pull + restart

### 5.2 사용자 AWS (테넌트 앱)

```
ALB (port 443, ACM SSL)
└── ECS Fargate Service
    └── Task Definition
        └── tenant-app 컨테이너
            ├── Nginx (port 80) — 정적 FE 서빙 + /api → NestJS 프록시 + 캐싱
            └── NestJS (port 3000)
```

- Docker 이미지: ECR (HaruOS 운영 계정에서 빌드 → 사용자 ECR에 복사)
- 업데이트: ECS Rolling Update (Blue/Green)

---

## 6. 모노레포 구조 (제안)

```
haruos/
├── apps/
│   ├── console-web/           # 관리 콘솔 FE (Vite + React)
│   ├── console-api/           # 관리 콘솔 BE (NestJS)
│   ├── tenant-web/            # 테넌트 앱 FE (Vite + React)
│   └── tenant-api/            # 테넌트 앱 BE (NestJS)
│
├── packages/
│   ├── shared-types/          # 공유 TypeScript 타입/DTO
│   ├── shared-ui/             # 공유 shadcn/ui 컴포넌트
│   └── shared-utils/          # 공유 유틸리티
│
├── infra/
│   ├── terraform/             # Terraform 모듈
│   ├── ansible/               # Ansible 플레이북
│   ├── cloudformation/        # IAM Role 템플릿
│   └── docker/                # Dockerfile, docker-compose.yml
│
├── docs/
├── ADR/
└── package.json               # 모노레포 워크스페이스 (pnpm)
```

---

## 7. 보안 구조

| 계층 | 방식 |
| --- | --- |
| AWS 자격 | STS AssumeRole only. 키 저장 안 함 |
| 관리 콘솔 인증 | 이메일/비밀번호 + JWT (Access 15분, Refresh 7일) |
| 테넌트 인증 | OTP(이메일) + JWT |
| API 통신 | HTTPS only (TLS 1.2+) |
| DB 접근 | 내부 네트워크만 (Docker network / VPC Security Group) |
| 비밀 관리 | 자체 서버: .env 파일 / 사용자 AWS: Secrets Manager |
| CORS | 도메인 화이트리스트 |

---

## 8. 공통 설계 패턴 (애착개발패턴 적용)

> `docs/애착개발패턴.md` 기반. NestJS + TypeORM 환경에 맞게 적용.

### 8.1 BaseEntity (공통 엔티티 상속)

모든 엔티티가 상속받는 공통 필드. TypeORM 데코레이터로 자동 설정.

```typescript
/**
 * 모든 엔티티의 공통 필드
 * - ID는 상속하지 않음 (엔티티마다 전략이 다름)
 * - soft delete 필요 시 deletedAt 추가
 */
export abstract class BaseEntity {
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

| 필드 | 설정 방식 | 비고 |
| --- | --- | --- |
| createdAt | @CreateDateColumn (INSERT 시 자동) | 필수 |
| updatedAt | @UpdateDateColumn (UPDATE 시 자동) | 필수 |
| deletedAt | @DeleteDateColumn (soft delete 시) | 선택 |

- ID 전략은 엔티티별 개별 정의 (UUID 권장)
- `createdBy`, `updatedBy`는 인증 컨텍스트가 있는 경우만 (NestJS Request Scope)

### 8.2 상태 머신 패턴 (State Machine)

상태를 가진 엔티티는 setter 금지. 비즈니스 메서드로만 전이.

**적용 대상:**

| 엔티티 | 상태 흐름 | 전이 메서드 |
| --- | --- | --- |
| Tenant | CREATING → ACTIVE → SUSPENDED → DELETED | activate(), suspend(), resume(), markDeleted() |
| Provisioning | PENDING → IN_PROGRESS → COMPLETED / FAILED / ROLLING_BACK | start(), complete(), fail(), rollback() |
| Subscription | TRIAL → ACTIVE → CANCELLED → EXPIRED | activate(), cancel(), expire() |
| Domain | PENDING → VERIFYING → ACTIVE → FAILED | verify(), activate(), fail() |

```typescript
// Tenant 엔티티 예시
class Tenant extends BaseEntity {
  status: string; // 공통코드 "TENANT_STATUS"

  /** CREATING → ACTIVE 전이 */
  activate(): void {
    if (this.status !== 'CREATING') {
      throw new InvalidStateTransitionException(this.status, 'ACTIVE');
    }
    this.status = 'ACTIVE';
  }

  /** ACTIVE → SUSPENDED 전이 */
  suspend(): void {
    if (this.status !== 'ACTIVE') {
      throw new InvalidStateTransitionException(this.status, 'SUSPENDED');
    }
    this.status = 'SUSPENDED';
  }
}
```

### 8.3 ApiResponse 래퍼

모든 REST API 응답을 단일 형식으로 통일. NestJS Interceptor에서 자동 래핑.

```typescript
{
  success: boolean;     // 요청 성공 여부
  code: string;         // "OK" 또는 에러코드
  message: string;      // 사람이 읽을 수 있는 메시지
  data: T;              // 실제 응답 데이터
  timestamp: string;    // ISO 8601
}
```

- **성공 응답**: Interceptor가 Controller 반환값을 자동 래핑
- **에러 응답**: GlobalExceptionFilter가 예외를 ApiResponse 형식으로 변환
- **페이징**: `data` 안에 `{ items, page, totalCount }`
- **바이너리 응답**: 예외 (DOCX 다운로드 등)

### 8.4 예외 계층 (Exception Hierarchy)

예외를 비즈니스/기술로 구분. GlobalExceptionFilter에서 집중 처리.
Controller/Service에 try-catch 작성하지 않는다.

```
CustomException (최상위, errorCode 포함)
├── BusinessException (4xx) — 사용자가 해결 가능
│   ├── ResourceNotFoundException (404)
│   ├── DuplicateResourceException (409)
│   ├── ValidationException (400)
│   ├── UnauthorizedException (401)
│   └── InvalidStateTransitionException (409) — 상태 전이 실패
└── TechnicalException (5xx) — 시스템 문제, 로깅 후 일반 메시지
    ├── ExternalApiException — AWS, ClickUp, Cloudflare 등
    ├── DatabaseException
    └── InfrastructureException — Terraform, Ansible 실행 실패
```

### 8.5 DTO/VO 변환 패턴

Entity를 API에 직접 노출하지 않는다. 반드시 DTO로 변환.

| 구분 | 규칙 | 예시 |
| --- | --- | --- |
| Request DTO | class-validator 데코레이터로 검증 | `CreateTenantRequestDto` |
| Response DTO | 팩토리 메서드 `from(entity)` | `TenantResponseDto.from(tenant)` |
| VO | 여러 DTO에서 공유되는 불변 값 객체 | `InfraStatusVo`, `MonthlyCostVo` |

**팩토리 메서드 네이밍:**

| 메서드 | 의미 | 예시 |
| --- | --- | --- |
| `of()` | 파라미터를 그대로 사용 | `Money.of(1000, 'KRW')` |
| `from()` | 다른 타입에서 변환 | `TenantResponseDto.from(tenant)` |
| `create()` | 복잡한 생성 로직 포함 | `Tenant.create(name, plan)` |

### 8.6 Repository 패턴

TypeORM Repository를 Service에서 직접 사용. 복잡한 쿼리는 Custom Repository로 분리.

```
Controller → Service → Repository (TypeORM)
```

**동적 검색 패턴 (TypeORM QueryBuilder):**

```typescript
const qb = this.tenantRepository.createQueryBuilder('t');

if (filter.status) {
  qb.andWhere('t.status = :status', { status: filter.status });
}
if (filter.keyword) {
  qb.andWhere('t.name ILIKE :keyword', { keyword: `%${filter.keyword}%` });
}
```

### 8.7 Facade 패턴

여러 서비스를 조합하는 복합 로직에만 사용. 단순 CRUD나 단일 서비스 호출에는 사용하지 않는다.

**적용 대상:**

| Facade | 조합하는 서비스 | 이유 |
| --- | --- | --- |
| ProvisionerFacade | TerraformService + AnsibleService + DomainService + HealthCheckService | 프로비저닝 전체 오케스트레이션 |
| TenantDashboardFacade | TenantService + MonitoringService + CostService + AiUsageService | 대시보드 데이터 조합 |
| DocumentProcessFacade | DocumentService + AiGatewayService + ClickUpService | 회의록 생성 → Action Item → ClickUp |

### 8.8 Nginx 역할 (관리 콘솔 + 테넌트 앱 공통)

| 역할 | 설정 |
| --- | --- |
| 리버스 프록시 | `/api` → NestJS backend |
| 정적 파일 서빙 | Vite 빌드 결과물 서빙 |
| 캐싱 | 정적 파일 `Cache-Control: max-age=31536000` (해시된 파일명), `index.html`은 `no-cache` |
| gzip 압축 | JS, CSS, JSON 압축 |
| 보안 헤더 | X-Frame-Options, X-Content-Type-Options, CSP |

### 8.9 프론트엔드 API 클라이언트

Axios 인스턴스 + 인터셉터로 공통 처리. 서버 상태는 TanStack Query.

| 인터셉터 | 역할 |
| --- | --- |
| Request | JWT 토큰 자동 첨부, 공통 헤더 |
| Response (성공) | ApiResponse 래퍼에서 `data` 추출 |
| Response (실패) | 에러 정규화, 401 시 토큰 갱신 시도 → 실패 시 로그아웃 |

### 8.10 WebSocket 패턴

커스텀 훅(`useWebSocket`)으로 분리. 자동 재연결: 지수 백오프 (1초 → 2초 → 4초, 최대 30초).

- 연결 시 JWT 토큰 전달
- heartbeat/ping-pong으로 연결 유지 확인
- 최대 재시도 10회 후 포기, 사용자에게 알림

### 8.11 캐시 전략

| 데이터 | TTL | 무효화 |
| --- | --- | --- |
| 공통코드 | 30분~1시간 | 코드 변경 시 명시적 삭제 |
| 사용자 세션 | 30분 | 로그아웃 시 삭제 |
| 집계/메트릭 | 5분 | CUD 시 삭제 |
| 목록 조회 | 1~5분 | CUD 시 삭제 |

- NestJS: `@nestjs/cache-manager` (메모리 캐시, 규모 커지면 Redis)
- CUD 발생 시 관련 캐시 명시적 삭제

---

## 9. 스키마 관리 (Flyway)

TypeORM의 `synchronize`/`migrations`를 사용하지 않고, Flyway로 스키마를 관리한다.
엔티티와 스키마를 분리하여, DB 변경 이력을 명확히 추적한다.

### 9.1 왜 Flyway인가

| 항목 | TypeORM migrations | Flyway |
| --- | --- | --- |
| 마이그레이션 언어 | TypeScript | SQL |
| 버전 관리 | 타임스탬프 기반 | 순차 번호 (V1, V2, ...) |
| 롤백 | 수동 작성 | Undo migration (U1, U2) |
| 멀티 DB | 어려움 | 설계 목적 |
| ORM 종속성 | TypeORM에 종속 | ORM 무관 |

- 관리 콘솔 DB + 테넌트 DB(프로비저닝 시) 모두 Flyway로 통일
- 테넌트 프로비저닝 시 Flyway CLI로 스키마 초기화
- 테넌트 앱 업데이트 시 Flyway CLI로 마이그레이션 실행

### 9.2 파일 구조

```
infra/
├── flyway/
│   ├── console/                    # 관리 콘솔 DB
│   │   ├── V1__init_schema.sql
│   │   ├── V2__add_alert_configs.sql
│   │   └── ...
│   └── tenant/                     # 테넌트 DB
│       ├── V1__init_schema.sql
│       ├── V1.1__enable_pgvector.sql
│       ├── V2__add_knowledge_tables.sql
│       └── ...
```

### 9.3 네이밍 규칙

| 유형 | 파일명 | 설명 |
| --- | --- | --- |
| 버전 | `V{번호}__{설명}.sql` | 순방향 마이그레이션 |
| Undo | `U{번호}__{설명}.sql` | 롤백 (필요 시) |
| 반복 | `R__{설명}.sql` | 뷰, 함수 등 반복 실행 가능 |

### 9.4 실행 시점

| 시점 | 대상 | 방식 |
| --- | --- | --- |
| 관리 콘솔 배포 | console DB | Docker Compose 시작 시 Flyway 컨테이너 실행 |
| 테넌트 프로비저닝 | tenant DB | Ansible 플레이북에서 Flyway CLI 실행 |
| 테넌트 앱 업데이트 | tenant DB | ECS 배포 전 Flyway CLI 실행 |

### 9.5 TypeORM 설정

```typescript
// TypeORM은 엔티티 매핑만 담당. 스키마 변경은 Flyway.
{
  synchronize: false,    // 절대 true 금지
  migrationsRun: false,  // TypeORM 마이그레이션 비활성화
}
```

---

## 10. API 문서화 전략

Swagger/OpenAPI 자동 생성을 정본으로 사용한다. 별도 API 명세 문서를 수동 작성하지 않는다.

### 10.1 구조

| 계층 | 도구 | 데코레이터 |
| --- | --- | --- |
| Controller | `@nestjs/swagger` | `@ApiTags`, `@ApiOperation`, `@ApiResponse` |
| DTO | `@nestjs/swagger` | `@ApiProperty` → 요청/응답 스키마 자동 생성 |
| Service/Port | TSDoc | `/** */` — 공개 메서드, 비즈니스 의도 |

### 10.2 Swagger 설정

- 엔드포인트: `/api/docs` (관리 콘솔), `/api/docs` (테넌트 앱)
- 환경별: dev/staging만 노출. production에서는 비활성화
- 인증: Swagger UI에서 Bearer 토큰 입력 지원

### 10.3 ApiResponse 래핑과 Swagger

```typescript
// Controller 예시
@ApiTags('tenants')
@Controller('tenants')
export class TenantController {

  @Post()
  @ApiOperation({ summary: '프로젝트 생성' })
  @ApiResponse({ status: 201, type: TenantResponseDto })
  create(@Body() dto: CreateTenantRequestDto): Promise<TenantResponseDto> {
    return this.tenantService.create(dto);
  }
}
```

- Controller는 `TenantResponseDto`를 반환
- Interceptor가 `ApiResponse<TenantResponseDto>`로 자동 래핑
- Swagger에는 래핑 전 DTO 스키마가 표시 (래핑 구조는 공통 문서로 안내)

### 10.4 TSDoc 작성 기준

```typescript
/**
 * 테넌트 프로비저닝을 시작한다.
 *
 * Terraform → Ansible 순서로 실행하며, 실패 시 자동 롤백.
 * SSE로 진행 상태를 실시간 전달한다.
 *
 * @param tenantId - 프로비저닝 대상 테넌트 ID
 * @throws ExternalApiException - AWS API 호출 실패 시
 * @throws InvalidStateTransitionException - 테넌트 상태가 CREATING이 아닌 경우
 */
async startProvisioning(tenantId: string): Promise<void>
```

- 메서드명으로 의도가 명확하면 생략
- 복잡한 비즈니스 로직, 예외 조건이 있을 때만 작성

### 10.5 문서 역할 분리

| 문서 | 역할 | 관리 방식 |
| --- | --- | --- |
| Swagger (`/api/docs`) | API 정본. 요청/응답 스키마, 엔드포인트 | 코드에서 자동 생성 |
| `docs/design/api/` | 설계 단계 API 초안 | 설계 완료 후 동결. 구현 후 Swagger가 정본 |
| TSDoc | 코드 내 비즈니스 의도 | 코드와 함께 유지 |
| DBML (`docs/design/data-model/`) | DB 스키마 설계 | Flyway SQL과 동기화 |
