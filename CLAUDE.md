# HaruOS — 프로젝트 규칙

## 프로젝트 개요

- **HaruOS**: 자연어 대화 + 자동 배치로 업무를 관리하는 AI 비서 SaaS
- **기획안**: `docs/planning.md` (참고용. API/스키마/디렉터리 구조는 별도 설계)
- **기술스택**: React + shadcn/ui (프론트) / NestJS + TypeScript (백엔드) / PostgreSQL + pgvector (DB) / AWS (Bedrock, S3, ECS, RDS)

---

## 아키텍처: 실용적 헥사고날 (NestJS 레이어드 + 포트/어댑터)

NestJS 기본 구조를 유지하면서, 외부 연동이 있는 모듈에만 포트/어댑터를 적용한다.

### 원칙

- Service는 Port(인터페이스)에만 의존. 구체 구현(Adapter)을 직접 참조하지 않는다.
- Adapter가 외부 시스템 호출을 담당한다 (AWS, ClickUp, Stripe, Cloudflare 등).
- NestJS Module에서 DI로 Port ↔ Adapter를 바인딩한다.
- 외부 연동이 없는 단순 CRUD 모듈은 Controller → Service → Repository로 충분.

### 디렉터리 구조 (외부 연동 있는 모듈)

```
src/modules/{module}/
├── {module}.controller.ts          # 인바운드 (HTTP)
├── {module}.service.ts             # 비즈니스 로직 (Port 인터페이스에 의존)
├── ports/
│   └── {외부시스템}.port.ts         # 인터페이스 정의
├── adapters/
│   └── {외부시스템}.adapter.ts      # Port 구현체
├── dto/
│   ├── {action}.request.dto.ts
│   └── {action}.response.dto.ts
├── entities/
│   └── {entity}.entity.ts
└── {module}.module.ts              # DI 바인딩
```

### 디렉터리 구조 (단순 CRUD 모듈)

```
src/modules/{module}/
├── {module}.controller.ts
├── {module}.service.ts
├── dto/
├── entities/
└── {module}.module.ts
```

### 포트/어댑터 적용 대상

| 모듈 | 포트 | 이유 |
| --- | --- | --- |
| document | ai-summarizer, storage | Bedrock, S3 |
| knowledge | embedding, vector-search | Bedrock Titan, pgvector |
| provisioner | terraform, ansible, dns | IaC 실행, Cloudflare/Route53 |
| monitoring | metric-collector, cost-collector | CloudWatch, Cost Explorer |
| billing | payment | Stripe |
| haru | ai-gateway | Bedrock (멀티모델 fallback) |
| file | storage | S3 |

---

## 코딩 컨벤션

### 공통 응답 형식 (ApiResponse)

모든 REST API 응답을 단일 형식으로 통일한다.

```typescript
{
  success: boolean;     // 요청 성공 여부
  code: string;         // "OK" 또는 에러코드
  message: string;      // 사람이 읽을 수 있는 메시지
  data: T;              // 실제 응답 데이터
  timestamp: string;    // ISO 8601
}
```

- 페이징 응답은 `data` 안에 `items`, `page`, `totalCount` 포함
- 파일 다운로드 등 바이너리 응답은 예외

### 예외 처리 (Exception Hierarchy)

예외를 비즈니스/기술로 구분하여 GlobalExceptionHandler에서 집중 처리.

```
CustomException (최상위, errorCode 포함)
├── BusinessException (4xx) - 사용자가 해결 가능
│   ├── ResourceNotFoundException (404)
│   ├── DuplicateResourceException (409)
│   ├── ValidationException (400)
│   └── UnauthorizedException (401)
└── TechnicalException (5xx) - 시스템 문제
    ├── ExternalApiException
    ├── DatabaseException
    └── InfrastructureException
```

- 모든 예외에 에러 코드 포함 (프론트엔드 연동, 로그 검색용)
- Controller/Service에 try-catch 작성하지 않는다

### DTO와 VO

Entity를 API에 직접 노출하지 않는다. 반드시 DTO로 변환.

**DTO (Data Transfer Object):** 계층 간 데이터 전송 단위

- Request DTO: class-validator 데코레이터로 검증. 네이밍: `*RequestDto`
- Response DTO: 팩토리 메서드 `from(entity)` 사용. 네이밍: `*ResponseDto`
- DTO는 VO의 조합으로 구성 가능

**VO (Value Object):** 재사용 가능한 불변 값 객체

- 불변(readonly). 동등성 비교는 값으로 판단.
- 여러 DTO에서 공유되는 값 구조를 VO로 분리. 네이밍: `*Vo`
- 파일 위치: `src/common/vo/` 또는 모듈 내 `vo/`

```
// VO 예시
TenantSummaryResponseDto
├── id: string
├── name: string
├── status: string
├── infra: InfraStatusVo      // VO - 여러 DTO에서 재사용
│   ├── ecsCpu: number
│   ├── rdsStorage: number
│   └── region: string
├── cost: MonthlyCostVo       // VO - 여러 DTO에서 재사용
│   ├── total: number
│   └── currency: string
└── createdAt: string
```

### 엔티티 규칙

- 공통 필드: `createdAt`, `updatedAt` (TypeORM `@CreateDateColumn`, `@UpdateDateColumn`)
- ID 전략은 엔티티마다 개별 정의 (UUID 권장)
- Soft delete 필요 시 `deletedAt` 추가
- 상태를 가진 엔티티는 setter 금지. 비즈니스 메서드(`activate()`, `suspend()`)로 전이.
- 상태 전이 시 허용되지 않은 전이는 예외 발생

### 팩토리 메서드

| 메서드 | 의미 | 예시 |
| --- | --- | --- |
| `of()` | 파라미터를 그대로 사용 | `Money.of(1000, 'KRW')` |
| `from()` | 다른 타입에서 변환 | `UserResponse.from(user)` |
| `create()` | 복잡한 생성 로직 포함 | `Tenant.create(name, plan)` |

### Facade 패턴

여러 서비스를 조합하는 복합 로직은 Facade 서비스를 사용한다.
단순 CRUD나 단일 서비스 호출에는 사용하지 않는다.

---

## 프론트엔드 컨벤션

### API 클라이언트

- Axios 인스턴스 + 인터셉터 (인증 토큰, 에러 정규화)
- 서버 상태 관리: TanStack Query (React Query)
- ApiResponse 래퍼에서 `data` 추출하는 공통 처리

### WebSocket

- 커스텀 훅으로 분리 (`useWebSocket`)
- 자동 재연결: 지수 백오프 (1초 → 2초 → 4초, 최대 30초)
- 연결 시 JWT 토큰 전달

---

## 공통코드 시스템 (CodeGroup + Code)

코드성 데이터(상태, 유형, 카테고리 등)는 Enum이 아닌 DB 기반 공통코드로 관리한다.
런타임에 코드 추가/수정이 가능하여 재배포 없이 변경 가능.

### 테이블 구조

```
code_groups
├── group_code: string (PK)    // "TENANT_STATUS", "PLAN_TYPE" 등
├── name: string               // "테넌트 상태"
└── description: string

codes
├── id: string (PK)
├── group_code: string (FK)
├── code: string               // "ACTIVE", "SUSPENDED"
├── name: string               // "활성", "일시중지"
├── sort_order: number
├── is_enabled: boolean
└── metadata: jsonb            // 추가 속성 (선택)
```

### 규칙

- 코드값(string)으로 직접 저장. FK를 잡지 않는다 (코드 비활성화 시 참조 무결성 문제 방지).
- 정합성은 애플리케이션 레벨에서 검증.
- 캐시 필수: TTL 30분~1시간. 코드 변경 시 캐시 무효화.
- 자주 사용하는 코드 그룹: 테넌트 상태, 프로비저닝 단계, 플랜 타입, 알림 유형, 도메인 타입, 배치 작업 상태 등

---

## 환경변수

- 상수값/설정값은 코드에 하드코딩하지 않는다
- NestJS `@nestjs/config` + `.env` 파일로 관리
- `.env.example`로 필요한 변수 목록 문서화
- 민감 정보(API 키, DB 비밀번호)는 코드에서 분리

---

## 문서화

- 공개 API: TSDoc 주석 필수
- API 엔드포인트: Swagger/OpenAPI 데코레이터
- 주석은 "왜"를 설명 (코드가 "무엇"과 "어떻게"를 설명)
- 메서드명으로 의도가 명확한 경우 주석 생략

---

## [REQUIRED] 브랜치/버전/커밋 규칙 (사내 표준)

> 원본: [`docs/design/사내 브랜치 컨벤션.md`](docs/design/사내%20브랜치%20컨벤션.md)
> 본 섹션은 사내 표준이며, 본 프로젝트는 GitHub PR을 사용한다(컨벤션 문서의 "MR" = "PR").

### 토폴로지 (단일 main 모델)

```
main ← vX.Y.Z (릴리스 통합, short-lived) ← feat-*, fix-* 등 (작업 단위)
hotfix/vX.Y.Z → main 직접 머지 (긴급 패치 예외)
```

- **단일 main 모델**: `production`/`develop`/`staging` 등 환경별 장수 브랜치 신설 금지
- 태그(`vX.Y.Z`)는 **코드 버전 식별자**. 브랜치는 *작업 흐름*만 표현
- `feat-*` 는 `main` 직접 PR 금지. 반드시 `vX.Y.Z` 경유
- `hotfix/vX.Y.Z` 만 `main` 직접 분기·머지 허용

### 브랜치 명명

| 종류 | 형식 | 예 |
| --- | --- | --- |
| 릴리스 통합 | `vX.Y.Z` | `v0.21.0` |
| 작업 | `<type>-<kebab-case>` | `feat-topology-layout`, `fix-snmp-timeout` |
| 핫픽스 | `hotfix/vX.Y.Z` | `hotfix/v0.20.7` |

Type: `feat`, `fix`, `refactor`, `perf`, `docs`, `chore`, `test`, `style`, `ci`

규칙:
- 작업 브랜치는 **하이픈** (`feat-foo`), slash 금지 (`feature/foo` 금지)
- 작업 브랜치명에 버전 prefix 금지 (이미 `vX.Y.Z` 안에 있음)
- 릴리스/핫픽스만 슬래시 (`hotfix/vX.Y.Z`)

### 버전 (SemVer)

| Bump | 언제 | 예 |
| --- | --- | --- |
| MAJOR | API 깨짐, 아키텍처 변경, 호환 안 됨 | v1.2.3 → v2.0.0 |
| MINOR | 기능 추가, 호환 유지 | v1.2.3 → v1.3.0 |
| PATCH | 버그 수정, 호환 유지 | v1.2.3 → v1.2.4 |

- 태그 형식: `vX.Y.Z` (소문자 v), 정규식 `^v\d+\.\d+\.\d+$`
- 태그 부여 전 모든 버전 파일 동기화 (`package.json` 등)
- v1.0.0 도달 전(`0.x.y`)은 MINOR도 호환 깰 수 있음 (SemVer 표준)
- 태그 재사용 금지 (한 번 부여한 `vX.Y.Z`는 영구)

### 커밋 (Conventional Commits)

형식:

```
<type>(<scope>): <subject>

<body>

<footer>
```

- type: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `style`, `ci`, `release`
- subject: 50자 이내, 명령형, 마침표 없음
- body: 72자/줄, *왜* 변경했는지 중심
- breaking change: footer에 `BREAKING CHANGE: ...` 명시 → MAJOR bump 필수

예:

```
feat(web): WebSocket wss 자동 매핑 추가

HTTPS 페이지에서 Mixed Content 차단되던 문제 해소.
```

### 워크플로

- **일반**: `main`에서 `vX.Y.Z` 생성 → `vX.Y.Z`에서 `feat-*` 분기 → PR(target: `vX.Y.Z`) → 머지 → 다른 기능 반복 → 릴리스 시 버전 동기화 + CHANGELOG + `vX.Y.Z` → `main` PR → 머지 후 태그 부여
- **핫픽스**: `main`에서 `hotfix/vX.Y.Z` 분기 → 수정 + PATCH bump → PR(target: `main`) → 머지 후 태그 부여
- **릴리스 커밋 메시지**: `release: vX.Y.Z`

### PR 룰

| 종류 | source → target | 머지 방식 |
| --- | --- | --- |
| 작업 | `feat-*` → `vX.Y.Z` | merge commit (squash 선택 가능) |
| 릴리스 | `vX.Y.Z` → `main` | **merge commit, squash 금지** |
| 핫픽스 | `hotfix/vX.Y.Z` → `main` | **merge commit, squash 금지** |

릴리스/핫픽스 squash 금지 이유: 어떤 작업이 어느 릴리스에 들어갔는지 히스토리 추적.

### 브랜치 삭제 정책

- 머지된 작업 브랜치(`feat-*`, `fix-*`, …) → **즉시 삭제**
- 머지된 핫픽스 브랜치 → **즉시 삭제**
- `vX.Y.Z` 릴리스 브랜치 → **`main` 머지 + 태그 후 삭제**
- GitHub PR "Automatically delete head branches" 기본 활성화 권장
- 로컬 브랜치 정리는 개발자 자율 (강제 X)

### 금지

- `main`에 직접 push (hotfix 머지 제외)
- `feat-*`를 `main`으로 직접 PR
- 핫픽스 외에 `main` 직접 분기
- 릴리스/핫픽스 PR squash 머지
- force-push to `main` 또는 `vX.Y.Z`
- 태그 재사용 (한 번 부여한 `vX.Y.Z`는 영구)
- `production`/`develop`/`staging` 등 환경별 장수 브랜치 신설
- 머지 완료된 브랜치 방치
- 작업 브랜치명에 slash 사용 (`feature/foo` 금지 → `feat-foo`)

### 빠른 결정

| 작업 | 브랜치 |
| --- | --- |
| 새 기능 (다음 릴리스 없음) | `main`에서 `vX.Y.Z` 생성 → `feat-*` 분기 |
| 새 기능 (다음 릴리스 진행 중) | `vX.Y.Z`에서 `feat-*` 분기 |
| 일반 버그 | `vX.Y.Z`에서 `fix-*` 분기 |
| 운영 긴급 버그 | `main`에서 `hotfix/vX.Y.Z` 분기 |
| 리팩토링 | `vX.Y.Z`에서 `refactor-*` 분기 |

---

## 캐시 전략

| 데이터 | TTL | 이유 |
| --- | --- | --- |
| 설정/공통코드 | 30분~1시간 | 변경 드묾 |
| 사용자 세션 | 30분 | 보안 |
| 집계 데이터 | 5분 | 실시간성 |
| 목록 조회 | 1~5분 | 변경 빈도 |

- CUD 발생 시 관련 캐시 명시적 삭제

---

## ADR / RFC (의사결정 기록)

프로젝트의 모든 주요 의사결정은 [`docs/decisions/`](docs/decisions/) 폴더에 기록한다.

| 폴더 | 용도 | 변경 가능성 |
| --- | --- | --- |
| [`docs/decisions/ADR/`](docs/decisions/ADR/) | **확정된** 의사결정 (Architecture Decision Record) | 확정 후 수정 X. 변경 시 새 ADR 작성 후 기존을 `대체됨`으로 변경 |
| [`docs/decisions/RFC/`](docs/decisions/RFC/) | **논의 중**인 제안 (Request For Comments) | 자유롭게 수정. 합의 시 ADR로 승격 |

### 워크플로우

```
RFC (제안/논의) ── 팀 합의 ──> ADR (확정 기록) ──> 코드/문서 반영
       │
       └── 합의 안 됨 ──> 폐기 / 보류
```

새 아이디어·제안은 **RFC로 시작**. 합의 후 새 ADR 작성. RFC는 히스토리로 보존.

### ADR 작성 기준 (합의된 결정만)

- 기술/라이브러리 선정 또는 변경
- 아키텍처, 프로토콜, 인터페이스 방식 결정
- 기획 요구사항 해석에 따른 설계 방향 결정
- 기존 결정을 번복하는 경우

### RFC 작성 기준 (합의 전 단계)

- 위 ADR 작성 기준에 해당하나 아직 합의가 없는 경우
- 사업/제품 방향성 검토
- 큰 리팩토링 또는 마이그레이션 제안
- 외부에 영향을 주는 인터페이스 변경 검토

### 파일 규칙

| 항목 | ADR | RFC |
| --- | --- | --- |
| 경로 | `docs/decisions/ADR/ADR-NNN-제목.md` | `docs/decisions/RFC/RFC-NNN-제목.md` |
| 번호 | 순차 부여 (001, 002, ...) | 순차 부여 (001, 002, ...) |
| 상태 | `제안` → `확정` → `대체됨` / `폐기` | `제안` → `논의 중` → `합의` → `확정으로 승격` / `폐기` / `보류` |
| 인덱스 | `docs/decisions/ADR/README.md`에 추가 | `docs/decisions/RFC/README.md`에 추가 |
| 템플릿 | [`docs/decisions/ADR/TEMPLATE.md`](docs/decisions/ADR/TEMPLATE.md) | [`docs/decisions/RFC/TEMPLATE.md`](docs/decisions/RFC/TEMPLATE.md) |

---

## 문서 작성 규칙

### Changelog

모든 문서 상단에 테이블 형식의 changelog를 작성한다.

```markdown
| 버전 | 변경내용 | 작성자 | 수정일 |
| --- | --- | --- | --- |
| v1.1 | 변경 내용 요약 | 김진범 | 2026-03-18 |
| v1.0 | 초기 작성 | 김진범 | 2026-03-18 |
```

- 작성자: 김진범
- 수정일: YYYY-MM-DD 형식
- 최신 버전이 상단

### 문서 디렉터리 구조

```
docs/
├── planning.md                 # 기획안 (참고용)
├── 애착개발패턴.md              # 개발 패턴/원칙 참조
├── decisions/                  # 의사결정 (ADR + RFC)
│   ├── ADR/                    # 확정된 결정
│   └── RFC/                    # 논의 중인 제안
├── design/                     # 설계 문서
│   ├── architecture/
│   ├── data-model/
│   └── api/
└── guides/                     # 가이드 문서
```

---

## 핵심 설계 결정 (확정)

| 항목 | 결정 | 근거 |
| --- | --- | --- |
| 테넌트 DB | 테넌트별 독립 RDS | 데이터 격리 컨셉 |
| AWS 연동 | CloudFormation Role + STS AssumeRole only | 키 저장 안 함, 법적 리스크 제거 |
| AI 모델 | Bedrock 멀티모델 fallback (Sonnet → Haiku) | 단일 모델 의존 제거 |
| 파일 업로드 | 압축파일(ZIP) 업로드 → S3 자동 처리 | Fargate SMB 마운트 불가 |
| 모니터링 | CloudWatch Metric Stream + EventBridge → SQS | 테넌트 증가 시 API throttling 회피 |
| BM | $19/월/테넌트, 전 기능 개방, 기능 잠금 없음 | 단순한 가격 구조 |
