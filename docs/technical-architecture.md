# HaruOS 기술 아키텍처 문서

| 버전 | 변경내용 | 작성자 | 수정일 |
| --- | --- | --- | --- |
| v1.1 | 전체 재작성 - 에이전트 상세, 코드 발췌 강화, CI/CD, 테스트 전략 추가 | 김진범 | 2026-03-24 |
| v1.0 | 초기 작성 (섹션 1~5) | 김진범 | 2026-03-22 |

---

## 1. 시스템 개요

### 1.1 프로젝트 소개

HaruOS는 자연어 대화와 자동 배치로 업무를 관리하는 AI 비서 SaaS다. 사용자는 "하루"라는 AI 비서와 대화하며 일정, 프로젝트, 문서, 지식 검색을 처리한다. 관리자는 별도 콘솔에서 테넌트 인프라를 프로비저닝하고 모니터링한다.

### 1.2 AWS 콘솔 모델 구조

```
┌──────────────────────────────────────────────────────────┐
│  사용자 브라우저 (React + shadcn/ui)                       │
│  ┌─────────────┐  ┌─────────────┐                        │
│  │ 관리 콘솔   │  │ 테넌트 앱   │                        │
│  └──────┬──────┘  └──────┬──────┘                        │
└─────────┼────────────────┼───────────────────────────────┘
          │ :3000          │ :3001
          ▼                ▼
┌─────────────────┐  ┌─────────────────┐
│  console-api    │  │  tenant-api     │
│  (NestJS)       │  │  (NestJS)       │
│                 │  │                 │
│  - Auth         │  │  - Auth (OTP)   │
│  - Tenant CRUD  │  │  - Haru AI 비서 │
│  - AWS 연동     │  │  - 에이전트들   │
│  - Provisioner  │  │  - 배치 엔진    │
│  - Monitoring   │  │  - 워치독       │
│  - Billing      │  │                 │
│  - Admin        │  │                 │
└────────┬────────┘  └────────┬────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌──────────────────────────────┐
│  Console DB     │  │  Tenant DB (테넌트별 독립)    │
│  PostgreSQL     │  │  PostgreSQL + pgvector        │
└─────────────────┘  └──────────────────────────────┘
         │                    │
         ▼                    ▼
┌──────────────────────────────────────────────────────────┐
│  AWS 인프라                                               │
│  Bedrock (AI) / S3 (파일) / ECS (컨테이너) / RDS (DB)    │
│  CloudWatch (모니터링) / CloudFormation (IaC)             │
│  Cloudflare (DNS) / Stripe (결제)                        │
└──────────────────────────────────────────────────────────┘
```

### 1.3 기술 스택

| 계층 | 기술 | 용도 |
| --- | --- | --- |
| 프론트엔드 | React + shadcn/ui + TanStack Query | UI, 서버 상태 관리 |
| 백엔드 | NestJS + TypeScript | REST API, WebSocket |
| ORM | TypeORM | DB 매핑, 마이그레이션 |
| DB | PostgreSQL + pgvector | 관계형 데이터 + 벡터 검색 |
| AI | AWS Bedrock (Sonnet -> Haiku fallback) | 대화, 요약, 인텐트, 임베딩 |
| 파일 | AWS S3 | 파일 저장, 백업 |
| 인프라 | AWS ECS + RDS + ALB | 테넌트별 독립 인프라 |
| IaC | Terraform + Ansible | 인프라 자동화 |
| DNS | Cloudflare + Route53 | 도메인 관리 |
| 결제 | Stripe | 구독 결제 |
| 실시간 | Socket.IO (WebSocket) | 알림, 스트리밍 |
| 인증 | JWT + OTP (tenant-api) / JWT + Password (console-api) | 인증/인가 |
| 캐시 | NestJS CacheManager | 공통코드, 설정 캐시 |
| 유효성 검증 | class-validator + Joi | DTO 검증, 환경변수 검증 |
| API 문서 | Swagger/OpenAPI | 자동 API 문서화 |

### 1.4 모노레포 구조

Turborepo + pnpm workspace 기반 모노레포. Node.js 22+, pnpm 10+.

```
haruos/                          # package.json: "haruos" v0.1.0
├── apps/
│   ├── console-api/             # 관리 콘솔 API (포트 3000) — NestJS
│   │   └── src/
│   │       ├── main.ts          # 부트스트랩 (CORS, Swagger, GlobalFilter/Interceptor)
│   │       ├── app.module.ts    # 10개 모듈 등록 + 전역 가드
│   │       ├── common/          # 예외, 필터, 가드, 인터셉터, 엔티티
│   │       └── modules/         # auth, tenant, aws, provisioner, domain,
│   │                            # monitoring, billing, common-code, backup, admin
│   ├── console-web/             # 관리 콘솔 SPA — React + shadcn/ui
│   ├── tenant-api/              # 테넌트 앱 API (포트 3001) — NestJS
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts    # Core + Haru + Agent 모듈
│   │       ├── common/          # 예외, 필터, 가드, 인터셉터 (console과 동일 구조)
│   │       ├── core/            # auth(OTP), ai-gateway, storage, doc-engine, clickup
│   │       ├── haru/            # orchestrator, context, batch, watchdog, gateway
│   │       ├── agents/          # project, schedule, document, knowledge, file
│   │       └── modules/         # stats
│   └── tenant-web/              # 테넌트 앱 SPA — React + shadcn/ui
├── packages/
│   ├── shared-types/            # 프론트/백엔드 공유 타입 (ApiResponse 등)
│   ├── shared-ui/               # 공유 UI 컴포넌트
│   └── shared-utils/            # API 클라이언트, 날짜 유틸
├── infra/
│   ├── terraform/               # VPC, ECS, RDS, S3, ECR, IAM + 테넌트 모듈
│   ├── cloudformation/          # Cross-Account Trust Role + Ansible
│   ├── flyway/                  # Console DB + Tenant DB 마이그레이션
│   └── docker/                  # Dockerfile, compose, nginx 설정
├── .github/workflows/           # CI (lint+build+test) + CD (ECR push + ECS deploy)
├── ADR/                         # Architecture Decision Records
├── turbo.json                   # Turborepo 파이프라인 설정
└── docs/                        # 문서
```

**패키지 의존관계**:

```
console-web → shared-types, shared-utils, shared-ui
tenant-web  → shared-types, shared-utils, shared-ui
console-api → shared-types
tenant-api  → shared-types
```

**Turborepo 파이프라인** (`turbo.json`):
- `build`: `^build` 의존 (패키지 먼저 빌드), 출력: `dist/**`
- `dev`: 캐시 없음, persistent
- `lint`: `^build` 의존
- `test`: `build` 의존

---

## 2. 아키텍처

### 2.1 실용적 헥사고날 원칙

NestJS 기본 구조를 유지하면서 외부 연동이 있는 모듈에만 포트/어댑터를 적용한다.

- Service는 Port(추상 클래스)에만 의존. 구체 구현(Adapter)을 직접 참조하지 않는다
- NestJS Module에서 DI로 `{ provide: Port, useClass: Adapter }` 바인딩
- 외부 연동 없는 단순 CRUD 모듈은 Controller -> Service -> Repository로 충분
- 여러 서비스를 조합하는 복합 로직은 Facade 패턴 사용 (예: `ProvisionerFacade`)

### 2.2 포트/어댑터 적용 대상

| 모듈 | 포트 | 어댑터 | 외부 시스템 |
| --- | --- | --- | --- |
| auth (console) | `MailSenderPort` | `ConsoleMailAdapter` | 이메일 서비스 |
| auth (tenant) | `OtpSenderPort` | `ConsoleOtpAdapter` | OTP 발송 |
| aws | `AwsCredentialPort` | `StsAdapter` | AWS STS |
| provisioner | `TerraformPort`, `AnsiblePort`, `DnsPort` | 각 어댑터 | Terraform, Ansible, Cloudflare/Route53 |
| monitoring | `MetricCollectorPort`, `CostCollectorPort` | `CloudWatchAdapter`, `CostExplorerAdapter` | CloudWatch, Cost Explorer |
| billing | `PaymentPort` | Stripe 어댑터 | Stripe |
| ai-gateway | `AiModelPort` | `BedrockAdapter` | AWS Bedrock |
| storage | `StoragePort` | `S3Adapter` | AWS S3 |
| clickup | `ClickUpApiPort` | `ClickUpApiAdapter` | ClickUp API |

### 2.3 디렉터리 구조 패턴

**외부 연동 모듈** (포트/어댑터 적용):

```
modules/{module}/
├── {module}.controller.ts
├── {module}.service.ts
├── ports/
│   └── {외부시스템}.port.ts      # 추상 클래스
├── adapters/
│   └── {외부시스템}.adapter.ts   # 구현체
├── dto/
│   ├── {action}.request.dto.ts
│   └── {action}.response.dto.ts
├── entities/
│   └── {entity}.entity.ts
└── {module}.module.ts
```

**단순 CRUD 모듈**:

```
modules/{module}/
├── {module}.controller.ts
├── {module}.service.ts
├── dto/
├── entities/
└── {module}.module.ts
```

### 2.4 공통 인프라

**글로벌 파이프라인** (`main.ts`에서 설정):

```
Request -> ValidationPipe -> JwtAuthGuard -> ThrottlerGuard
        -> Controller -> Service -> ...
        -> ApiResponseInterceptor -> Response
        -> GlobalExceptionFilter (에러 시)
```

- `GlobalExceptionFilter`: 모든 예외를 `ApiResponse<null>` 형식으로 변환. `TechnicalException`은 로그만 남기고 일반 메시지 반환
- `ApiResponseInterceptor`: Controller 반환값을 `{ success, code, message, data, timestamp }` 형식으로 래핑
- `JwtAuthGuard`: `@Public()` 데코레이터가 있으면 인증 건너뜀
- `ThrottlerGuard`: 60초당 60회 요청 제한

**예외 계층**:

```
CustomException (errorCode 포함)
├── BusinessException (4xx)
│   ├── ResourceNotFoundException (404)
│   ├── DuplicateResourceException (409)
│   ├── ValidationException (400)
│   ├── UnauthorizedException (401)
│   └── InvalidStateTransitionException (409)
└── TechnicalException (5xx)
    ├── ExternalApiException (502)
    ├── DatabaseException (500)
    └── InfrastructureException (500)
```

**엔티티 공통 필드**:

```typescript
// BaseEntity: createdAt, updatedAt
// SoftDeletableEntity: createdAt, updatedAt, deletedAt
```

---

## 3. console-api 모듈 상세

console-api는 관리 콘솔 백엔드. 테넌트 생성/관리, AWS 연동, 인프라 프로비저닝, 모니터링, 결제를 담당한다.

**부트스트랩** (`apps/console-api/src/main.ts`):

```typescript
const app = await NestFactory.create(AppModule, { rawBody: true });  // Stripe Webhook용
app.setGlobalPrefix('api');
app.enableCors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true });
app.useGlobalFilters(new GlobalExceptionFilter());        // 예외 → ApiResponse 변환
app.useGlobalInterceptors(new ApiResponseInterceptor());  // 성공 응답 래핑
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,            // DTO에 정의된 필드만 허용
  forbidNonWhitelisted: true, // 정의되지 않은 필드 → 400
  transform: true,            // 자동 타입 변환
}));
// Swagger: /api/docs
```

**모듈 구성** (`app.module.ts`):
- `ConfigModule.forRoot()`: `.env` 파일 + Joi 스키마 검증
- `TypeOrmModule.forRootAsync()`: PostgreSQL, `autoLoadEntities: true`, `synchronize: false`
- `JwtModule.registerAsync()`: 전역 JWT (시크릿: env)
- `ThrottlerModule.forRoot()`: 60req/60sec
- 전역 가드: `JwtAuthGuard` (인증) + `ThrottlerGuard` (rate limiting)

### 3.1 Auth 모듈

이메일/비밀번호 인증. 회원가입 시 이메일 인증 코드 발송 (`MailSenderPort`).

**포트/어댑터**: `MailSenderPort` (추상 클래스) → `ConsoleMailAdapter` (개발: 콘솔 로그 출력)

```typescript
// apps/console-api/src/modules/auth/ports/mail-sender.port.ts
export abstract class MailSenderPort {
  abstract sendVerificationEmail(email: string, token: string): Promise<void>;
}

// apps/console-api/src/modules/auth/auth.module.ts — DI 바인딩
{ provide: MailSenderPort, useClass: ConsoleMailAdapter }
```

**엔티티**:
- `UserEntity`: id(UUID), email(unique), passwordHash, name, role('USER'|'ADMIN'), isEmailVerified, emailVerifiedAt, lastLoginAt
- `EmailVerificationEntity`: id, userId, token(unique), expiresAt, verifiedAt
- `RefreshTokenEntity`: id, userId(indexed), tokenHash(unique), expiresAt, revokedAt

**회원가입 흐름** (`AuthService.signup()`):

```
1. 이메일 중복 검증 → DuplicateResourceException
2. bcrypt.hash(password, 10) → passwordHash
3. UserEntity 생성 (role: 'USER', isEmailVerified: false)
4. UUID 인증 토큰 생성, 24시간 TTL
5. EmailVerificationEntity 저장
6. MailSenderPort.sendVerificationEmail(email, token)
7. SignupResponseDto.from(user) 반환
```

**로그인 흐름** (`AuthService.login()`):

```
1. 이메일로 사용자 조회 → UnauthorizedException
2. bcrypt.compare(password, passwordHash) → UnauthorizedException
3. JWT Access Token 발급 (payload: {sub, email, role}, 15분)
4. Refresh Token: UUID → bcrypt.hash → DB 저장 (7일 TTL)
5. user.lastLoginAt 갱신
6. {accessToken, refreshToken, user: UserSummaryVo} 반환
```

**토큰 갱신 최적화** (`AuthService.refreshAccessToken()`):

```
1. 만료된 Access Token에서 userId 추출 (jwtService.decode)
2. userId 기반으로 해당 유저의 미폐기 토큰만 조회 → O(k) 보장
3. 각 토큰에 대해 bcrypt.compare 수행
4. 일치하는 토큰 발견 → 새 Access Token 발급
5. decode 실패 시 전체 조회로 fallback
```

**API**:
| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | 회원가입 | Public |
| POST | `/api/auth/login` | 로그인 | Public |
| POST | `/api/auth/verify-email` | 이메일 인증 | Public |
| POST | `/api/auth/refresh` | 토큰 갱신 | Public |
| POST | `/api/auth/change-password` | 비밀번호 변경 | JWT |

### 3.2 CommonCode 모듈

DB 기반 공통코드 시스템. 재배포 없이 코드 추가/수정 가능. 캐시 TTL 30분.

**엔티티**: `CodeGroupEntity` (groupCode PK, name, description), `CodeEntity` (id, groupCode, code, name, sortOrder, isEnabled, metadata JSONB)

**캐시 전략**: `CACHE_MANAGER`로 그룹 목록/개별 그룹 캐시. CUD 시 명시적 무효화.

**API**:
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/common-codes/groups` | 그룹 목록 |
| GET | `/api/common-codes/groups/:groupCode` | 그룹 상세 + 코드 목록 |
| POST | `/api/common-codes/groups` | 그룹 생성 |
| POST | `/api/common-codes/codes` | 코드 생성 |

### 3.3 Tenant 모듈

테넌트(프로젝트) CRUD. 상태 전이는 엔티티 비즈니스 메서드로만 수행.

**엔티티**: `TenantEntity` (id, userId, name, slug, description, status, plan, region, trialEndsAt, suspendedAt). `SoftDeletableEntity` 상속.

**상태 전이**:

```
CREATING --activate()--> ACTIVE --suspend()--> SUSPENDED
                            ^                      |
                            +---resume()----------+
```

**API**:
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/api/tenants` | 생성 (CREATING) |
| GET | `/api/tenants` | 내 목록 |
| GET | `/api/tenants/:id` | 상세 |
| PATCH | `/api/tenants/:id` | 수정 (이름, 설명) |
| DELETE | `/api/tenants/:id` | Soft delete |
| POST | `/api/tenants/:id/suspend` | 일시 중지 |
| POST | `/api/tenants/:id/resume` | 재개 |
| POST | `/api/tenants/:id/scale` | 플랜 변경 |
| POST | `/api/tenants/:id/update` | 앱 업데이트 트리거 |

### 3.4 AWS 모듈

CloudFormation Role + STS AssumeRole 기반 AWS 연동. 키 저장 없음.

**엔티티**: `AwsCredentialEntity` (id, tenantId, roleArn, externalId, region, status, validatedAt, lastAssumedAt)

**상태 전이**: `PENDING --validate()--> VALIDATED --invalidate()--> INVALID`

**흐름**:
1. `getCfnLaunchUrl()`: Quick Create URL 생성 (ExternalId 포함)
2. 사용자가 AWS 콘솔에서 CloudFormation 스택 생성
3. `validateCredential()`: STS AssumeRole로 Role 검증 + Bedrock 접근 확인
4. `assumeRole()`: 프로비저닝/모니터링 시 임시 자격증명 발급

**API**:
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/tenants/:tenantId/aws/cfn-template-url` | CFn 스택 URL |
| GET | `/api/tenants/:tenantId/aws/cfn-launch-url` | 1클릭 Quick Create URL |
| POST | `/api/tenants/:tenantId/aws/validate` | 자격증명 검증 |
| GET | `/api/tenants/:tenantId/aws/credential` | 자격증명 조회 |

### 3.5 Provisioner 모듈

`ProvisionerFacade`가 Terraform, Ansible, DNS 포트를 오케스트레이션. SSE 스트리밍으로 실시간 상태 전송.

**엔티티**: `ProvisioningJobEntity` (status, currentStep, totalSteps, completedSteps, terraformStateKey), `ProvisioningLogEntity`, `TenantInfraEntity` (ecsClusterArn, rdsEndpoint, s3BucketName, albDnsName, vpcId 등)

**프로비저닝 파이프라인** (5단계 순차 실행):

```
TERRAFORM_PLAN → TERRAFORM_APPLY → ANSIBLE_SETUP → DNS_SETUP → HEALTH_CHECK
     plan()          apply()         runPlaybook()     createRecord()   verifyDns()
```

**SSE 스트리밍** (`streamStatus()`) — 2초 간격으로 DB 폴링, 상태/단계 변경 시에만 이벤트 전송:

```typescript
// apps/console-api/src/modules/provisioner/provisioner.service.ts
streamStatus(tenantId: string): Observable<MessageEvent> {
  return new Observable<MessageEvent>((subscriber) => {
    let lastStatus = '';
    let lastCompletedSteps = -1;
    const sub = interval(2000).pipe(startWith(0)).subscribe(async () => {
      const job = await this.jobRepository.findOne({ where: { tenantId }, order: { createdAt: 'DESC' } });
      if (job.status !== lastStatus || job.completedSteps !== lastCompletedSteps) {
        subscriber.next(new MessageEvent('status', { data: JSON.stringify(dto) }));
        if (TERMINAL_STATUSES.includes(job.status)) {
          subscriber.next(new MessageEvent('done', { data: JSON.stringify({ status: job.status }) }));
          subscriber.complete();
        }
      }
    });
  });
}
```

**상태 전이**:

```
PENDING --start()--> IN_PROGRESS --complete()--> COMPLETED
                         |
                    --fail()--> FAILED --rollback()--> ROLLING_BACK --completeRollback()--> ROLLED_BACK
```

**API**:
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/api/tenants/:tenantId/provision` | 프로비저닝 시작 |
| GET | `/api/tenants/:tenantId/provision/status` | 상태 조회 |
| GET | `/api/tenants/:tenantId/provision/status/stream` | SSE 스트리밍 |
| GET | `/api/tenants/:tenantId/provision/logs` | 로그 조회 |
| POST | `/api/tenants/:tenantId/provision/rollback` | 롤백 |

### 3.6 Domain 모듈

서브도메인 자동 생성 + 커스텀 도메인 관리. Cloudflare API 검증 지원.

**엔티티**: `DomainEntity` (domain, type, dnsProvider, status, isPrimary, cnameTarget, sslStatus, cloudflareZoneId)

**상태 전이**: `PENDING --verify()--> VERIFIED --activate()--> ACTIVE`, 어디서든 `--fail()--> FAILED`

**API**:
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/api/tenants/:tenantId/domains` | 커스텀 도메인 추가 |
| GET | `/api/tenants/:tenantId/domains` | 목록 |
| DELETE | `/api/tenants/:tenantId/domains/:domainId` | 삭제 (primary 불가) |
| PATCH | `/api/tenants/:tenantId/domains/:domainId/set-primary` | 기본 도메인 변경 |
| POST | `/api/tenants/:tenantId/domains/validate-cloudflare` | Cloudflare 검증 |
| POST | `/api/tenants/:tenantId/domains/:domainId/verify-dns` | DNS CNAME 검증 |

### 3.7 Monitoring 모듈

CloudWatch/Cost Explorer에서 수집한 메트릭, 비용, AI 사용량 조회. 알림 설정 관리.

**엔티티**: `MetricEntity` (tenantId, metricType, value, unit, collectedAt), `CostRecordEntity`, `AiUsageRecordEntity`, `AlertConfigEntity`, `AlertHistoryEntity`

**API**:
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/tenants/:tenantId/metrics` | 메트릭 (최근 100건) |
| GET | `/api/tenants/:tenantId/costs` | 비용 |
| GET | `/api/tenants/:tenantId/costs/breakdown` | 서비스별 비용 상세 |
| GET | `/api/tenants/:tenantId/ai-usage` | AI 사용량 |
| GET | `/api/tenants/:tenantId/alerts` | 알림 설정 목록 |
| PATCH | `/api/tenants/:tenantId/alerts/:alertId` | 알림 설정 수정 |

### 3.8 Billing 모듈

Stripe 연동 구독 결제. `PaymentPort`를 통해 Checkout, Portal, Webhook 처리.

**엔티티**: `SubscriptionEntity` (tenantId, status, planType, stripeCustomerId, stripeSubscriptionId, currentPeriodStart/End, cancelledAt)

**상태 전이**:

```
TRIAL --activate()--> ACTIVE --markPastDue()--> PAST_DUE --reactivate()--> ACTIVE
                         |                         |
                    --cancel()                --cancel()
                         ▼                         ▼
                     CANCELLED                 CANCELLED
                         |
                    --expire()--> EXPIRED
```

**Stripe 연동 흐름**:

```
1. createSubscription(): Customer 생성 (PaymentPort) → TRIAL 상태로 DB 저장
2. createCheckoutSession(): Stripe Checkout URL 생성 → 프론트엔드 리다이렉트
3. (사용자 결제 완료) → Stripe Webhook 수신
4. handleWebhook(): rawBody + Stripe-Signature 헤더로 서명 검증
5. invoice.paid → ACTIVE 상태 전이, 구독 기간 갱신
```

**Webhook 서명 검증** (`billing.controller.ts`):

```typescript
@Post('webhook')
@Public()  // JWT 인증 없이 접근 (Stripe 서명으로 보호)
async handleWebhook(
  @Req() req: RawBodyRequest<Request>,       // rawBody 필요
  @Headers('stripe-signature') signature: string,
): Promise<{ received: true }> {
  const rawBody = req.rawBody;  // NestFactory.create(AppModule, { rawBody: true })
  await this.billingService.handleWebhook(rawBody, signature);
  return { received: true };
}
```

**Webhook 처리**: `invoice.paid` (복구), `invoice.payment_failed` (PAST_DUE), `customer.subscription.updated` (기간 동기화), `customer.subscription.deleted` (취소)

**API**:
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/api/billing/subscriptions` | 구독 생성 |
| GET | `/api/billing/subscriptions/:tenantId` | 구독 조회 |
| DELETE | `/api/billing/subscriptions/:tenantId` | 구독 취소 |
| POST | `/api/billing/checkout` | Checkout 세션 |
| POST | `/api/billing/portal` | Customer Portal |
| GET | `/api/billing/invoices/:tenantId` | 인보이스 목록 |
| POST | `/api/billing/webhook` | Stripe Webhook (Public) |

### 3.9 Backup 모듈

테넌트 데이터 백업/내보내기. 비동기 실행 후 S3 presigned URL로 다운로드.

**엔티티**: `BackupEntity` (tenantId, type, status, s3Key, sizeBytes, errorMessage, completedAt)

**타입**: `FULL` (전체 백업), `EXPORT` (데이터 내보내기)

**상태 전이**:

```
PENDING --start()--> IN_PROGRESS --complete(s3Key, sizeBytes)--> COMPLETED
                         |
                    --fail(errorMessage)--> FAILED
```

**비동기 실행 패턴**: API는 PENDING 상태의 레코드만 생성하고 즉시 반환. 실제 백업은 `executeBackup()`에서 비동기 처리. 실패해도 API 응답에 영향 없음.

**API**:
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/api/tenants/:tenantId/backups` | 백업 시작 |
| GET | `/api/tenants/:tenantId/backups` | 목록 |
| GET | `/api/tenants/:tenantId/backups/:backupId/download` | 다운로드 URL |
| POST | `/api/tenants/:tenantId/backups/export` | 데이터 내보내기 |

### 3.10 Admin 모듈

`AdminGuard`로 role === 'ADMIN' 체크. 전체 테넌트/사용자 조회, 강제 중지/재개, 대시보드 통계.

**API**:
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/admin/dashboard` | 대시보드 통계 |
| GET | `/api/admin/tenants` | 전체 테넌트 |
| POST | `/api/admin/tenants/:id/suspend` | 강제 중지 |
| POST | `/api/admin/tenants/:id/resume` | 강제 재개 |
| GET | `/api/admin/users` | 전체 사용자 |

---

## 4. tenant-api 모듈 상세

tenant-api는 테넌트별 독립 RDS에 연결된 앱 API. OTP 인증, AI 비서(Haru), 에이전트, 배치 엔진을 담당한다.

### 4.1 Auth 모듈 (OTP 인증)

비밀번호 없이 이메일 OTP로 인증. 6자리 코드 발송 -> 검증 -> JWT 발급.

**엔티티**: `TenantUserEntity` (id, email, name, role, isActive, lastLoginAt), `OtpEntity`, `RefreshTokenEntity`

**인증 흐름**:
1. `POST /auth/otp/request`: OTP 코드 생성 (5분 TTL) -> 이메일 발송
2. `POST /auth/otp/verify`: OTP 검증 -> Access Token + Refresh Token 발급
3. Refresh Token: UUID -> bcrypt hash -> DB 저장. 갱신 시 hash 비교

**API**:
| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/auth/otp/request` | OTP 발송 | Public |
| POST | `/api/auth/otp/verify` | OTP 검증 + 로그인 | Public |
| POST | `/api/auth/refresh` | 토큰 갱신 | Public |
| POST | `/api/auth/logout` | 로그아웃 | JWT |

### 4.2 AI Gateway 모듈

`AiModelPort` 추상 클래스를 통해 Bedrock 멀티모델 fallback (Sonnet -> Haiku). 모든 AI 호출을 단일 진입점으로 통합.

**포트 메서드**: `chat()`, `streamChat()`, `summarize()`, `extractIntent()`, `generateEmbedding()`

**어댑터**: `BedrockAdapter` - AWS Bedrock API 호출. 모델 교체 시 어댑터만 변경.

### 4.3 Storage 모듈

`StoragePort` -> `S3Adapter`로 S3 파일 관리. upload, download, delete, getPresignedUrl.

### 4.4 DocEngine 모듈

Markdown -> DOCX 변환 엔진. 외부 연동 없이 로컬 처리.

### 4.5 ClickUp 모듈

`ClickUpApiPort` -> `ClickUpApiAdapter`로 ClickUp API 연동. 태스크 CRUD, Space/List 조회, 전체 동기화.

**API**:
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/clickup/spaces` | Space 목록 |
| GET | `/api/clickup/spaces/:spaceId/lists` | List 목록 |
| GET | `/api/clickup/lists/:listId/tasks` | 태스크 목록 |
| POST | `/api/clickup/tasks` | 태스크 생성 |
| PUT | `/api/clickup/tasks/:taskId` | 태스크 수정 |
| POST | `/api/clickup/sync` | 전체 동기화 |

### 4.6 Haru 오케스트레이터

AI 비서 "하루"의 핵심 엔진. 사용자 메시지를 받아 의도 분석 -> 에이전트 라우팅 -> 응답 생성.

**처리 흐름**:

```
사용자 메시지
    │
    ▼
ContextManagerService: 대화 맥락 조회/생성, 메시지 저장
    │
    ▼
IntentParserService: AI로 인텐트 추출 (schedule/project/document/knowledge/file/general)
    │
    ▼
AgentRouterService: 인텐트 -> 에이전트 매핑 -> 에이전트별 시스템 프롬프트로 AI 호출
    │
    ▼
응답 저장 + 반환 (일반 응답 또는 SSE 스트리밍)
```

**API**:
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/api/haru/chat` | 대화 (일반 응답) |
| POST | `/api/haru/chat/stream` | 대화 (SSE 스트리밍) |
| GET | `/api/haru/conversations` | 대화 목록 |
| GET | `/api/haru/conversations/:id/messages` | 메시지 목록 |

**WebSocket Gateway** (`/ws/haru`): JWT 인증 -> 사용자별 room 가입. `sendNotification(userId, type, data)`으로 알림 전송.

### 4.7 Context Manager

대화 맥락 관리. 토큰 제한(8000토큰) 내에서 최신 메시지 우선 보존. 30일 미사용 대화 자동 아카이브.

**엔티티**: `Conversation` (id, userId, title), `Message` (id, conversationId, role, content, metadata JSONB, tokenCount)

**핵심 로직**:
- `getContextWithinTokenLimit()`: system 메시지 항상 유지. 최신 메시지부터 역순으로 토큰 합산하여 8000 이하로 제한
- `estimateTokenCount()`: 한국어 기준 text.length / 2로 간이 추정

### 4.8 배치 엔진

5개 예약 작업을 cron 기반으로 실행. 수동 트리거도 지원.

**엔티티**: `BatchJob` (name, cronExpression, isEnabled, lastRunAt, lastRunStatus, lastRunDurationMs, lastError)

**등록된 작업**:

| 작업명 | Cron 식 | 스케줄 | 설명 |
| --- | --- | --- | --- |
| `daily-briefing` | `0 8 * * *` | 매일 08:00 UTC | 오늘 일정, 마감 임박 태스크, 어제 대화 요약 |
| `clickup-sync` | `0 */6 * * *` | 6시간마다 | ClickUp Space/List/Task 동기화 |
| `watch-folder-scan` | `*/5 * * * *` | 5분마다 | S3 감시 폴더 새 파일 탐지 → 인덱싱 트리거 |
| `embedding-refresh` | `0 2 * * *` | 매일 02:00 UTC | 변경 문서 임베딩 갱신 + pgvector VACUUM |
| `weekly-report` | `0 9 * * 1` | 매주 월 09:00 UTC | 완료 태스크, AI 사용량, 활동 요약 |

**공통 실행 패턴** (`@nestjs/schedule` 기반):

```typescript
// 모든 배치 작업의 공통 패턴 (daily-briefing.job.ts 예시)
@Cron('0 8 * * *', { name: 'daily-briefing' })
async handleCron(): Promise<void> {
  await this.execute();
}

async execute(): Promise<void> {
  const startTime = Date.now();
  const jobRecord = await this.batchJobRepository.findOne({ where: { name: 'daily-briefing' } });
  if (jobRecord && !jobRecord.isEnabled) return;  // 비활성화 시 스킵
  try {
    // 실제 로직...
    jobRecord.recordExecution('SUCCESS', Date.now() - startTime);
  } catch (error) {
    jobRecord.recordExecution('FAILED', Date.now() - startTime, error.message);
  }
  await this.batchJobRepository.save(jobRecord);
}
```

- `isEnabled` 플래그로 런타임에 작업 활성화/비활성화 가능
- 수동 트리거 API (`POST /batch/jobs/:id/trigger`)에서 `execute()` 직접 호출
- `recordExecution()`으로 lastRunAt, lastRunStatus, lastRunDurationMs, lastError 기록

**API**:
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/batch/jobs` | 작업 목록 |
| POST | `/api/batch/jobs` | 작업 생성 |
| POST | `/api/batch/jobs/:id/trigger` | 수동 실행 |
| POST | `/api/batch/jobs/:id/disable` | 비활성화 |
| POST | `/api/batch/jobs/:id/enable` | 활성화 |

### 4.9 워치독

S3 이벤트(SQS 경유)와 ClickUp Webhook을 수신하여 자동 처리.

- `S3EventListener`: ObjectCreated/ObjectDeleted 이벤트 수신. 파일 인덱싱, 지식베이스 갱신 트리거
- `ClickUpWebhookController`: ClickUp 태스크 변경 이벤트 수신

---

## 5. RAG 상세

### 5.1 아키텍처 개요

Knowledge Agent는 문서를 청크로 분할 -> 임베딩 벡터 생성 -> pgvector 저장 -> 코사인 유사도 검색 -> AI 질의응답의 RAG 파이프라인을 구현한다.

```
문서 인덱싱:  Document -> splitIntoChunks() -> generateEmbedding() -> DB 저장
질의응답:     Question -> generateEmbedding() -> semanticSearch() -> AI chat()
```

### 5.2 DocumentChunk 엔티티

```typescript
@Entity('document_chunks')
export class DocumentChunk extends BaseEntity {
  id: string;              // UUID PK
  documentId: string;      // 원본 문서 ID
  chunkIndex: number;      // 청크 순서
  content: string;         // 청크 텍스트
  embedding: number[];     // float8[] (pgvector 캐스팅 가능)
  tokenCount: number;      // 추정 토큰 수
}
```

임베딩은 `float8[]`로 저장하여 `::vector` 캐스팅으로 pgvector 연산을 수행한다. pgvector 미설치 환경에서도 배열로 저장/조회 가능.

### 5.3 인덱싱 프로세스

`KnowledgeAgentService.indexDocument()`:

1. **기존 청크 삭제**: `DELETE FROM document_chunks WHERE document_id = :documentId`
2. **청크 분할** (`splitIntoChunks()`):
   - 단락(빈 줄 `\n\n`) 기준으로 1차 분할
   - 단락 합산 길이가 500자 초과 시 새 청크로 분리
   - 빈 결과 방지: 전체 텍스트가 하나의 청크가 되도록 fallback
3. **임베딩 생성**: 청크마다 `AiGatewayService.generateEmbedding()` 호출 (Bedrock Titan)
   - 실패 시 null로 fallback (키워드 검색만 가능)
4. **DB 저장**: 청크별로 `DocumentChunk` 엔티티 생성 및 저장

### 5.4 벡터 검색

`VectorSearchService`가 3가지 검색 모드를 제공한다.

**시맨틱 검색** (`semanticSearch()`):

```sql
SELECT *, 1 - (embedding::vector <=> $1::vector) AS score
FROM document_chunks
WHERE embedding IS NOT NULL
ORDER BY embedding::vector <=> $1::vector
LIMIT $2
```

- `<=>`: pgvector 코사인 거리 연산자
- `1 - distance`로 유사도 점수(0~1) 변환
- pgvector 미설치 시 빈 배열 반환 (키워드 fallback)

**키워드 검색** (`keywordSearch()`):

```sql
SELECT * FROM document_chunks
WHERE content ILIKE '%query%'
ORDER BY chunk_index ASC
LIMIT $1
```

- 고정 점수 0.5 할당
- pgvector 미설치 환경의 fallback으로 사용

**하이브리드 검색** (`hybridSearch()`):

```
최종 점수 = 벡터 점수 * 0.7 + 키워드 점수 * 0.3
```

- 시맨틱/키워드 검색을 병렬 실행 (`Promise.all`)
- 청크 ID 기준으로 점수 병합
- 중복 청크는 두 점수를 합산

### 5.5 RAG 질의응답 프로세스

`KnowledgeAgentService.askQuestion()`:

1. **질문 임베딩 생성**: `aiGatewayService.generateEmbedding(question)`
2. **관련 청크 검색**: `semanticSearch(queryEmbedding, 5)` -> 실패 시 `keywordSearch(question, 5)`
3. **컨텍스트 조립**:

```
[Chunk 1 (doc: doc-uuid-1)]:
청크 내용...

[Chunk 2 (doc: doc-uuid-2)]:
청크 내용...
```

4. **AI 호출**:

```typescript
await aiGatewayService.chat([
  { role: 'system', content: RAG_SYSTEM_PROMPT },
  { role: 'user', content: `Context:\n${contextText}\n\nQuestion: ${question}` },
]);
```

시스템 프롬프트:
> "Answer based ONLY on the provided context. If the context doesn't contain enough information, say so honestly. Always cite which document chunks you used."

5. **출처 정보 조립**: 각 검색 결과의 chunkId, documentId, content, score를 `SourceChunkDto`로 변환

### 5.6 API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/api/agents/knowledge/index` | 문서 인덱싱 (청크 분할 + 임베딩) |
| GET | `/api/agents/knowledge/search?query=&limit=` | 지식 검색 |
| POST | `/api/agents/knowledge/ask` | RAG 질의응답 |
| DELETE | `/api/agents/knowledge/documents/:documentId` | 문서 청크 삭제 |

---

## 6. 에이전트 모듈 상세

### 6.1 Project Agent

ClickUp Space와 동기화하여 프로젝트/태스크를 관리한다.

**파일**: `apps/tenant-api/src/agents/project/`

**엔티티**: `ProjectSyncEntity` (clickupSpaceId, name, lastSyncAt, status)

**DB 테이블** (`infra/flyway/tenant/V1__init_schema.sql`):
- `projects`: id, name, description, status, category, clickup_space_id, progress, created_by
- `project_tasks`: id, project_id, title, description, status, priority, assignee_id, due_date, clickup_task_id, sort_order
- `project_syncs`: id, clickup_space_id, name, last_sync_at, status

**핵심 기능**:
- ClickUp Space 동기화: `ProjectAgentService`가 `ClickUpService`를 호출하여 Space → 로컬 프로젝트 동기화
- 자연어 → 태스크 변환: AI Gateway를 통해 "내일까지 발표자료 만들어" 같은 자연어를 태스크로 변환

### 6.2 Schedule Agent

일정 CRUD + 상태 전이 + ClickUp 태스크 연동.

**파일**: `apps/tenant-api/src/agents/schedule/`

**엔티티**: `Schedule` (title, description, startAt, endAt, isAllDay, location, status, recurrenceRule, reminderMinutes, projectId, clickupTaskId, createdBy)

**상태 전이**:

```
SCHEDULED --confirm()--> CONFIRMED
                |
           --cancel()--> CANCELLED
```

**핵심 코드** (`schedule-agent.service.ts`):

```typescript
// 일정 생성 — 기본 SCHEDULED 상태로 생성
async createSchedule(userId: string, dto: CreateScheduleRequestDto): Promise<Schedule> {
  const schedule = this.scheduleRepository.create({
    createdBy: userId,
    title: dto.title,
    startAt: new Date(dto.startAt),
    endAt: dto.endAt ? new Date(dto.endAt) : null,
    isAllDay: dto.isAllDay ?? false,
    status: ScheduleStatus.SCHEDULED,
  });
  return this.scheduleRepository.save(schedule);
}

// ClickUp 동기화 — 기존 태스크가 있으면 업데이트, 없으면 생성
async syncWithClickUp(scheduleId: string): Promise<void> {
  const schedule = await this.scheduleRepository.findOne({ where: { id: scheduleId } });
  if (schedule.clickupTaskId) {
    await this.clickUpService.updateTask(schedule.clickupTaskId, { ... });
  } else {
    const task = await this.clickUpService.createTask({ ... });
    schedule.clickupTaskId = task.id;
    await this.scheduleRepository.save(schedule);
  }
}
```

**기간 필터 조회**: `Between()`, `MoreThanOrEqual()`, `LessThanOrEqual()` TypeORM 연산자로 날짜 범위 조회.

**API**:
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/api/schedules` | 일정 생성 |
| GET | `/api/schedules` | 목록 조회 (from/to 필터) |
| PATCH | `/api/schedules/:id` | 수정 (상태 전이 포함) |
| POST | `/api/schedules/:id/cancel` | 일정 취소 |
| POST | `/api/schedules/:id/sync-clickup` | ClickUp 동기화 |

### 6.3 Document Agent

문서 CRUD + AI 요약 + Action Item 추출 + DOCX 내보내기 + 공유 링크.

**파일**: `apps/tenant-api/src/agents/document/`

**엔티티**: `Document` (title, content, summary, type, status, projectId, s3Key, wordCount, createdBy)

**상태 전이**:

```
DRAFT --publish()--> PUBLISHED --archive()--> ARCHIVED
```

**핵심 기능**:

```typescript
// apps/tenant-api/src/agents/document/document-agent.service.ts

// AI 요약
async summarize(documentId: string): Promise<string> {
  const document = await this.documentRepository.findOne({ where: { id: documentId } });
  return this.aiGatewayService.summarize(document.content);
}

// Action Item 추출
async extractActionItems(documentId: string): Promise<string[]> {
  const response = await this.aiGatewayService.chat([
    { role: 'system', content: '주어진 문서에서 Action Item을 추출하세요.' },
    { role: 'user', content: document.content },
  ]);
  return response.content.split('\n').filter((line) => line.trim().length > 0);
}

// DOCX 변환 + S3 업로드 → 공유 링크 (presigned URL)
async getShareLink(documentId: string): Promise<ShareLinkResponseDto> {
  const buffer = await this.exportToDocx(documentId);
  const s3Key = `shared/documents/${documentId}.docx`;
  await this.storageService.upload(s3Key, buffer, 'application/vnd...');
  const fileInfo = await this.storageService.getFileInfo(s3Key, 3600);
  return ShareLinkResponseDto.of(fileInfo.url, 3600);
}
```

**API**:
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/api/documents` | 문서 생성 |
| GET | `/api/documents` | 목록 (type 필터) |
| GET | `/api/documents/:id` | 상세 |
| PATCH | `/api/documents/:id` | 수정 (상태 전이 포함) |
| POST | `/api/documents/:id/summarize` | AI 요약 |
| POST | `/api/documents/:id/action-items` | Action Item 추출 |
| GET | `/api/documents/:id/export-docx` | DOCX 변환 |
| GET | `/api/documents/:id/share-link` | 공유 링크 (presigned URL) |

### 6.4 File Agent

S3 파일 업로드/다운로드/삭제 + 메타데이터 관리.

**파일**: `apps/tenant-api/src/agents/file/`

**엔티티**: `File` (originalName, s3Key, sizeBytes, mimeType, status, uploadedBy)

**DB 테이블**:
- `files`: id, original_name, s3_key, size_bytes, mime_type, category, status, project_id, parent_file_id, uploaded_by
- `file_tasks`: id, file_id, task_type, status, result(JSONB), error_message
- `file_task_logs`: id, file_task_id, action, detail(JSONB)

**핵심 코드** (`file-agent.service.ts`):

```typescript
// 파일 업로드: S3 저장 + 메타데이터 DB 저장
async uploadFile(userId: string, fileName: string, buffer: Buffer, mimeType: string): Promise<File> {
  const s3Key = `files/${userId}/${randomUUID()}/${fileName}`;
  await this.storageService.upload(s3Key, buffer, mimeType);
  const file = this.fileRepository.create({
    originalName: fileName, s3Key, sizeBytes: String(buffer.length),
    mimeType, status: 'UPLOADED', uploadedBy: userId,
  });
  return this.fileRepository.save(file);
}

// 파일 삭제: S3 + DB 동시 제거
async deleteFile(fileId: string): Promise<void> {
  const file = await this.fileRepository.findOne({ where: { id: fileId } });
  await this.storageService.delete(file.s3Key);
  await this.fileRepository.remove(file);
}
```

**API**:
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| POST | `/api/files/upload` | 파일 업로드 |
| GET | `/api/files` | 목록 |
| GET | `/api/files/:id/url` | Presigned URL |
| DELETE | `/api/files/:id` | 삭제 |

---

> 이어지는 내용: [docs/technical-architecture-part2.md](./technical-architecture-part2.md)
>
> Part 2 목차: 실시간 통신, 프론트엔드 아키텍처, 공유 패키지, 인프라(Docker/Terraform/CloudFormation/Flyway/CI/CD), 보안, 공통 패턴
