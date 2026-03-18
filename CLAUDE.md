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

## 버전 관리

- Semantic Versioning: `MAJOR.MINOR.PATCH`
- 개발 단계: `0.x.x`
- 정식 릴리스: `1.0.0`
- 커밋: `<type>: <subject>` (feat, fix, refactor, docs, test, chore)

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

## ADR (Architecture Decision Record)

프로젝트의 모든 주요 의사결정은 `ADR/` 폴더에 기록한다.

### 작성 기준

다음 중 하나에 해당하면 ADR을 작성한다:

- 기술/라이브러리 선정 또는 변경
- 아키텍처, 프로토콜, 인터페이스 방식 결정
- 기획 요구사항 해석에 따른 설계 방향 결정
- 기존 결정을 번복하는 경우

### 파일 규칙

- 경로: `ADR/ADR-NNN-제목.md`
- 번호: 순차 부여 (001, 002, ...)
- 상태: `제안` → `확정` → `대체됨` / `폐기`
- 확정된 ADR은 수정하지 않는다. 변경 시 새 ADR을 작성하고 기존 ADR 상태를 `대체됨`으로 변경.
- 새 ADR 작성 시 `ADR/README.md` 목록에 추가.

### 템플릿

```markdown
# ADR-NNN: 제목

- **상태**: 제안 / 확정 / 대체됨 / 폐기
- **일자**: YYYY-MM-DD
- **결정자**: 이름

## 배경
왜 이 결정이 필요한지

## 검토 선택지
1. **선택지 A** → 장단점
2. **선택지 B** → 장단점

## 결정
최종 선택

## 근거
왜 이것을 선택했는지

## 영향
이 결정으로 인해 변경되거나 추가 확인이 필요한 사항
```

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
