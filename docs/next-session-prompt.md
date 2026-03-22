# HaruOS 에이전트 팀 프롬프트 (다음 세션용)

> 이 파일을 다음 Claude Code 세션에서 그대로 입력하면 됩니다.
> 사용 후 삭제해도 됩니다.

---

## 프롬프트

```
HaruOS 프로젝트를 에이전트 팀으로 진행한다. CLAUDE.md와 프로젝트 규칙을 반드시 따를 것.

## 현재 상태

### 완료된 것 (console-api)
- auth 모듈: 회원가입, 로그인, 이메일 인증, 토큰 갱신, 비밀번호 변경 (14 테스트)
- common-code 모듈: 공통코드 CRUD + 캐시 + Flyway 시드 (11 테스트)
- tenant 모듈: CRUD + suspend/resume + 소유권 검증 (14 테스트)
- aws 모듈: 포트/어댑터, CloudFormation URL, Role ARN 검증
- domain 모듈: 서브도메인, 커스텀 도메인 CRUD, 상태 전이
- monitoring 모듈: 포트/어댑터, 메트릭/비용/AI사용량/알림
- provisioner 모듈: Facade 패턴, Terraform/Ansible/DNS 포트/어댑터
- 공통 코드: Exception Hierarchy, GlobalExceptionFilter, ApiResponseInterceptor, JwtAuthGuard

### 남은 작업

#### 1. console-api 마무리
- billing 모듈 구현 (P4 stub 수준, 포트/어댑터)
- 전체 빌드/테스트 통합 검증

#### 2. tenant-api 구현 (전체가 stub 상태)
- core/auth: OTP + JWT (console-api auth와 다름)
- core/ai-gateway: Bedrock 멀티모델 fallback 포트/어댑터
- core/storage: S3 포트/어댑터
- core/doc-engine: Markdown → DOCX (pandoc)
- core/clickup: ClickUp API 포트/어댑터
- haru/orchestrator: 의도 분석, 계획 수립, 에이전트 라우팅
- haru/context: 대화 맥락 관리
- haru/batch: 배치 스케줄러
- haru/watchdog: S3 이벤트, ClickUp 웹훅
- agents/project: ClickUp 프로젝트 연동
- agents/schedule: ClickUp 일정 연동
- agents/document: 회의록, 요약, Action Item
- agents/knowledge: pgvector 임베딩, RAG
- agents/file: S3 파일 관리

#### 3. 프론트엔드 (console-web, tenant-web)
- 현재 빈 App.tsx만 있음
- 전체 UI 구현 필요

## 에이전트 팀 구성 (5명)

### 팀원 1: console-finisher
- billing 모듈 구현 (P4 stub)
- console-api 전체 빌드/테스트 통합 검증
- 모듈 간 import 누락, 타입 에러 수정
- 완료 후 커밋

### 팀원 2: tenant-core
- tenant-api/src/core/ 5개 모듈 구현
- auth (OTP + JWT), ai-gateway (Bedrock), storage (S3), doc-engine, clickup
- 포트/어댑터 패턴 적용 (ai-gateway, storage, clickup)
- TSDoc + 단위 테스트

### 팀원 3: tenant-haru
- tenant-api/src/haru/ 전체 구현
- orchestrator (의도 분석, 에이전트 라우팅)
- context (대화 맥락)
- batch (스케줄러)
- watchdog (S3 이벤트, 웹훅)
- TSDoc + 단위 테스트

### 팀원 4: tenant-agents
- tenant-api/src/agents/ 5개 에이전트 구현
- project, schedule, document, knowledge, file
- 각 에이전트 서비스 + 컨트롤러 + 엔티티
- TSDoc + 단위 테스트

### 팀원 5: quality-gate
- 모든 팀원 작업 완료 후 실행
- tenant-api 전체 빌드 검증
- tenant-api 전체 테스트 실행
- console-api + tenant-api 통합 빌드 확인
- TSDoc 누락 체크
- CLAUDE.md 규칙 위반 체크 (예외 계층, ApiResponse, 상태 전이, DTO 팩토리)
- 문제 있으면 해당 팀원에게 수정 요청

## 공통 규칙 (모든 팀원 필수)

1. CLAUDE.md 규칙 엄격 준수
2. 레퍼런스: console-api/src/modules/auth/ 패턴 따름
3. 포트/어댑터: Service는 Port(추상 클래스)에만 의존, Adapter가 외부 호출
4. 예외: BusinessException(4xx) / TechnicalException(5xx), Controller에 try-catch 금지
5. DTO: Request는 class-validator, Response는 static from() 팩토리
6. 엔티티: BaseEntity 상속, 상태 전이는 비즈니스 메서드만 (setter 금지)
7. TSDoc: 모든 공개 메서드에 @param, @returns, @throws
8. 테스트: 단위 테스트 필수 (Repository/Port mock)
9. Swagger: @ApiTags, @ApiOperation, @ApiResponse 데코레이터

## 의존관계

console-finisher → (독립)
tenant-core → (독립, 먼저 시작)
tenant-haru → tenant-core 완료 후 (core 모듈 import 필요)
tenant-agents → tenant-core 완료 후 (core 모듈 import 필요)
quality-gate → 전원 완료 후

에이전트 팀을 구성하고 작업을 시작해줘.
```
