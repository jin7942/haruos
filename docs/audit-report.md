# HaruOS 검수 보고서

| 버전 | 변경내용 | 작성자 | 수정일 |
| --- | --- | --- | --- |
| v1.0 | 초기 작성 | 김진범 | 2026-03-22 |

## 1. 기능 완성도

planning.md 대비 전체 요구사항 전수 검사 결과.

### 요약

| 상태 | 건수 |
| --- | --- |
| OK | 57 |
| PARTIAL | 5 |
| MISSING | 2 |

### MISSING (2건)

| 항목 | 설명 | 비고 |
| --- | --- | --- |
| `GET /api/projects/:id` | 프로젝트 상세 조회 엔드포인트 (tenant-api) | ClickUp 기반으로 동작하여 별도 상세 조회 미구현 |
| `GET /api/documents/:id` | 문서 상세 조회 엔드포인트 (tenant-api) | 목록 조회에서 개별 ID 필터링으로 대체 가능 |

### PARTIAL (5건)

| 항목 | 설명 | 비고 |
| --- | --- | --- |
| `/projects/:id/billing` 페이지 | 별도 빌링 페이지 없음 | MonitoringPage에 통합 가능 |
| settings 하위 라우트 3개 | `/settings/aws`, `/settings/domain`, `/settings/plan` | SettingsPage 단일 페이지에서 탭으로 처리 |
| 테넌트 API 경로 | `/api/agents/*`로 변경 | planning.md와 경로 다르나 기능 동일 |
| ClickUp 웹훅 경로 | `/api/webhooks/clickup` | planning.md: `/api/clickup/webhook` |
| 가격 정책 | $19/월, $190/년 | Stripe Price ID 외부 관리 (올바른 설계) |

### 특기사항

- planning.md에 없지만 추가 구현: Admin 모듈, Backup 모듈, WebSocket 게이트웨이, SSE 스트리밍, Rollback 기능
- API 경로 일부 변경은 RESTful 설계 개선 (예: `/api/aws/*` -> `/api/tenants/:id/aws/*`)
- DB 스키마 완전: 16개 테이블 + 인덱스 + 시드 데이터 + Flyway 마이그레이션 3개

---

## 2. 보안 점검

### OWASP Top 10 체크리스트

| 항목 | 상태 | 비고 |
| --- | --- | --- |
| A01 Broken Access Control | 수정 완료 | Billing IDOR 수정, AdminGuard 추가 |
| A02 Cryptographic Failures | 양호 | bcrypt salt 10 rounds, JWT 서명 |
| A03 Injection | 양호 | parameterized query 사용, raw query도 $1/$2 바인딩 |
| A04 Insecure Design | 양호 | Port/Adapter 분리, 예외 계층 |
| A05 Security Misconfiguration | 수정 완료 | WebSocket CORS wildcard 수정 |
| A06 Vulnerable Components | 양호 | 최신 NestJS 11, 의존성 관리 |
| A07 Auth Failures | 양호 | JwtAuthGuard 글로벌 적용, @Public 적절 사용 |
| A08 Software/Data Integrity | 양호 | ValidationPipe whitelist + forbidNonWhitelisted |
| A09 Logging/Monitoring Failures | 양호 | GlobalExceptionFilter에서 stack trace 서버 로그만 기록 |
| A10 SSRF | 양호 | 외부 호출은 Adapter 계층에서만 수행 |

### 수정 완료 이슈 (3건)

| 심각도 | 이슈 | 수정 내용 |
| --- | --- | --- |
| CRITICAL | WebSocket CORS `origin: '*'` | `process.env.CORS_ORIGIN` 사용으로 변경 |
| CRITICAL | Billing Controller IDOR | 전 엔드포인트에 `verifyTenantOwnership()` 추가 |
| MEDIUM | Common-code POST AdminGuard 누락 | `@UseGuards(AdminGuard)` 추가 |

### 미수정 이슈 (4건)

| 심각도 | 이슈 | 권장 조치 |
| --- | --- | --- |
| HIGH | Tenant-API Refresh Token 미저장 | JWT 서명 발급 또는 DB 해시 저장 방식 채택 |
| HIGH | ClickUp Webhook 서명 미검증 | HMAC 서명 검증 추가 |
| MEDIUM | Console-API refreshToken O(n) 스캔 | token prefix 저장 또는 userId 기반 검색 범위 축소 |
| LOW | Tenant-API logout 미구현 | Redis 토큰 블랙리스트 또는 DB 무효화 |

### 양호 항목

- Rate Limiting: ThrottlerGuard 글로벌 적용 (60req/60s)
- 비밀 관리: .env gitignore, 코드 내 하드코딩 없음
- 에러 정보 노출: TechnicalException은 "Internal server error"로 마스킹
- XSS: dangerouslySetInnerHTML 미사용
- CORS (HTTP): 환경변수 기반 + credentials: true

---

## 3. 아키텍처 준수율

CLAUDE.md 규칙 7개 영역 전수 검사 결과.

| 규칙 | 상태 | 비고 |
| --- | --- | --- |
| 포트/어댑터 패턴 | PASS | 12 포트, 13 어댑터. Service에서 Adapter 직접 import 없음 |
| ApiResponse 통일 | PASS | GlobalExceptionFilter + ApiResponseInterceptor 전역 등록 |
| 예외 계층 | PASS | CustomException -> Business/Technical 구조 준수. Controller에 try-catch 없음 |
| DTO/VO | PASS | 41개 Response DTO에 from()/of() 팩토리 메서드. 35개 Request DTO에 class-validator. Swagger 데코레이터 211개 |
| 엔티티 규칙 | 수정 완료 | setter 없음. 2건 상태 전이 메서드 추가 |
| 공통코드 시스템 | PASS | Enum 사용 0건. DB 기반 공통코드 + 캐시 TTL 30분 |
| 캐시 전략 | PASS | CUD 시 캐시 무효화 구현 완료 |

### 수정 완료 (2건)

| 파일 | 이슈 | 수정 내용 |
| --- | --- | --- |
| `apps/tenant-api/src/agents/file/entities/file.entity.ts` | status 필드에 비즈니스 메서드 없음 | `markExtracted()`, `markFailed()` 추가 |
| `apps/tenant-api/src/agents/project/entities/project.entity.ts` | status 필드에 비즈니스 메서드 없음 | `markSynced()`, `archive()` 추가 |

---

## 4. 테스트 현황

| 앱 | 테스트 파일 | 테스트 수 | 통과율 |
| --- | --- | --- | --- |
| console-api | 12 suites | 153 | 100% |
| tenant-api | 23 suites | 118 | 100% |
| console-web | 4 suites | 13 | 100% |
| tenant-web | 4 suites | 15 | 100% |
| **합계** | **43 suites** | **299** | **100%** |

### 빌드 상태

| 앱 | 빌드 | 타입체크 |
| --- | --- | --- |
| console-api | PASS | PASS |
| tenant-api | PASS | PASS |
| console-web | PASS | PASS |
| tenant-web | PASS | PASS |

---

## 5. 검수 중 발견/수정 이슈 목록

### 보안 수정 (3건)
1. WebSocket CORS wildcard 수정 (`provisioner.gateway.ts`, `haru.gateway.ts`)
2. Billing Controller IDOR 수정 (`billing.controller.ts`, `billing.service.ts`, `billing.module.ts`, `billing.service.spec.ts`)
3. Common-code AdminGuard 추가 (`common-code.controller.ts`)

### 아키텍처 수정 (2건)
4. File 엔티티 상태 전이 메서드 추가 (`file.entity.ts`, `nas-organizer.service.ts`)
5. Project 엔티티 상태 전이 메서드 추가 (`project.entity.ts`)

### 테스트 수정 (1건)
6. nas-organizer.service.spec.ts 테스트 수정 (markExtracted mock 누락 → Object.assign(new File(), ...) 사용)

---

## 6. 남은 이슈

후속 스프린트에서 처리 권장.

| 우선순위 | 이슈 | 설명 |
| --- | --- | --- |
| HIGH | Tenant-API Refresh Token | UUID로 생성되지만 DB 미저장. refresh 기능 미작동 |
| HIGH | ClickUp Webhook 서명 검증 | @Public 엔드포인트에서 HMAC 미검증 |
| MEDIUM | refreshToken O(n) 스캔 | 사용자 증가 시 DoS 벡터 |
| LOW | Tenant-API logout | 서버 측 토큰 무효화 미구현 |
| LOW | 프로젝트 상세 조회 API | `GET /api/projects/:id` 미구현 |
| LOW | 문서 상세 조회 API | `GET /api/documents/:id` 미구현 |
