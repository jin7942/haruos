# HaruOS 고도화: 자율형 AI 비서 (OpenClaw 컨셉 벤치마킹)

| 버전 | 변경내용 | 작성자 | 수정일 |
| --- | --- | --- | --- |
| v1.1 | Pi Harness SDK 통합 설계 추가 (에이전트 런타임 엔진) | 김진범 | 2026-05-13 |
| v1.0 | 초기 작성 - 항시 동작 자율형 AI 비서 설계 | 김진범 | 2026-05-13 |

> **상태:** 고도화 예정 (Phase 3+)
> **벤치마킹:** OpenClaw (항시 동작하는 AI 에이전트)
> **목적:** HaruOS의 "하루" AI 비서를 대화형(reactive)에서 자율형(proactive)으로 진화시킨다. 사용자가 명령하지 않아도 스스로 이벤트를 감지하고, 판단하고, 실행하고, 결과를 보고하는 "항시 알아서 동작하는 AI 비서"를 구현한다.

---

## 1. 컨셉: "던져놓으면 알아서 한다" → "물어보지 않아도 알아서 한다"

### 1.1 현재 HaruOS (Reactive 모드)

```
사용자 명령 → 하루 응답 → 실행
```
- 사용자가 자연어로 요청하면 하루가 처리
- 사용자가 묻지 않으면 아무것도 하지 않음

### 1.2 자율형 HaruOS (Proactive 모드)

```
이벤트 감지 → AI 판단 → 자율 실행 → 사전 보고/알림
```
- 하루가 스스로 이벤트를 감지하고 판단
- 중요도/긴급도에 따라 자율 실행 또는 사전 승인 요청
- 결과를 사용자에게 메신저/알림으로 보고

---

## 2. 핵심 아키텍처

### 2.1 자율 AI 비서 루프 (Autonomous Agent Loop)

```
┌──────────────────────────────────────────────────────────────┐
│                    Autonomous Agent Loop                       │
│                                                               │
│  ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐ │
│  │  Sense   │───▶│  Think   │───▶│   Act    │───▶│ Notify  │ │
│  │ (감지)   │    │ (판단)   │    │ (실행)   │    │ (보고)  │ │
│  └─────────┘    └──────────┘    └──────────┘    └─────────┘ │
│       ▲                                              │       │
│       └──────────────────────────────────────────────┘       │
│                      Feedback Loop                            │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 4단계 처리 흐름

#### Stage 1: Sense (감지)
외부/내부 이벤트 소스에서 변화를 감지한다.

| 이벤트 소스 | 감지 방식 | 예시 |
| --- | --- | --- |
| ClickUp Webhook | 실시간 수신 | 태스크 상태 변경, 댓글 추가, 기한 변경 |
| AWS CloudWatch | Metric Stream → SQS | CPU 급등, 비용 임계값 초과, 에러율 상승 |
| 캘린더 API | 주기적 폴링 (5분) | 일정 30분 전 알림, 회의 충돌 감지 |
| 이메일/메신저 | Webhook 수신 | 중요 이메일 도착, 멘션 알림 |
| 문서 변경 | S3 이벤트 알림 | 공유 문서 수정, 새 문서 업로드 |
| 배치 스케줄 | Cron 기반 | 일일 리포트, 주간 요약, 비용 분석 |
| 사용자 패턴 | 행동 분석 | 반복 업무 감지, 미처리 태스크 누적 |

#### Stage 2: Think (판단)
AI가 이벤트의 중요도, 긴급도, 실행 방안을 판단한다.

```
이벤트 수신
    │
    ▼
[컨텍스트 수집]  ← 관련 태스크, 일정, 문서, 사용자 선호도
    │
    ▼
[중요도/긴급도 분류]
    │
    ├── 높음 + 긴급 → 즉시 실행 + 즉시 알림
    ├── 높음 + 비긴급 → 승인 요청 후 실행
    ├── 낮음 + 긴급 → 자동 실행 + 일괄 보고
    └── 낮음 + 비긴급 → 일일 요약에 포함
    │
    ▼
[실행 계획 수립]  ← 어떤 액션을 어떤 순서로 실행할지
```

**판단 기준 (사용자 설정 가능)**:
- 자율 실행 범위: "일정 변경은 자동, 비용 관련은 승인 필요"
- 알림 채널: "긴급은 카카오톡, 일반은 이메일"
- 활동 시간: "밤 11시~아침 7시는 긴급만 알림"

#### Stage 3: Act (실행)
판단 결과에 따라 자율적으로 액션을 실행한다.

| 카테고리 | 자율 실행 액션 | 예시 |
| --- | --- | --- |
| 태스크 관리 | ClickUp 태스크 생성/이동/댓글 | 기한 임박 태스크 리마인더 댓글 추가 |
| 일정 관리 | 일정 조정/충돌 해결 제안 | 회의 충돌 시 대안 시간 제안 |
| 문서 처리 | 자동 분류/요약/회의록 생성 | 새 문서 업로드 시 프로젝트에 자동 연결 |
| 인프라 관리 | AWS 리소스 조정/알림 | 비용 이상 감지 시 리소스 축소 제안 |
| 보고서 생성 | 일일/주간/월간 리포트 자동 생성 | 매일 아침 8시 어제의 업무 요약 발송 |
| 이메일 초안 | 회의 후 follow-up 이메일 초안 | 회의 종료 후 자동으로 요약 + 액션 아이템 정리 |

#### Stage 4: Notify (보고)
실행 결과를 사용자에게 적절한 채널로 보고한다.

| 긴급도 | 채널 | 형식 |
| --- | --- | --- |
| 긴급 | 카카오톡/Slack 즉시 알림 | "[긴급] 서버 CPU 90% 초과. ECS 태스크 스케일 아웃 실행 완료." |
| 중요 | 카카오톡/Slack 알림 | "내일 오전 회의 2개가 겹칩니다. A를 30분 뒤로 옮길까요?" |
| 일반 | 앱 내 알림 + 이메일 | "오늘 처리한 업무 5건, 미처리 3건. 상세 보기 →" |
| 참고 | 일일 요약 리포트 | "이번 주 AWS 비용이 지난 주 대비 15% 증가했습니다." |

---

## 3. 자율 실행 정책 시스템

### 3.1 정책 계층

사용자가 하루의 자율 실행 범위를 세밀하게 제어할 수 있다.

```
[글로벌 정책]           ← 전체 기본 설정
    │
    ├── [카테고리별 정책]  ← 태스크/일정/문서/인프라 별
    │       │
    │       └── [액션별 정책]  ← 개별 액션 단위
    │
    └── [시간대 정책]     ← 업무 시간/야간/주말
```

### 3.2 정책 데이터 모델

```sql
-- 자율 실행 정책
CREATE TABLE agent_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,        -- 'task', 'schedule', 'document', 'infra', 'report'
    action_type VARCHAR(100) NOT NULL,    -- 'create_task', 'move_schedule', 'generate_report'
    autonomy_level VARCHAR(20) NOT NULL,  -- 'auto', 'approve', 'notify_only', 'disabled'
    conditions JSONB DEFAULT '{}',        -- 추가 조건 (시간대, 비용 임계값 등)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 자율 실행 로그
CREATE TABLE agent_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_source VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    decision VARCHAR(20) NOT NULL,        -- 'auto_executed', 'awaiting_approval', 'notified', 'skipped'
    action_type VARCHAR(100),
    action_result JSONB,
    policy_id UUID REFERENCES agent_policies(id),
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 승인 대기열
CREATE TABLE agent_approval_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_log_id UUID REFERENCES agent_action_logs(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    proposed_action JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',  -- 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'
    expires_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 기본 정책 (Default Autonomy Levels)

| 카테고리 | 액션 | 기본 자율 수준 | 근거 |
| --- | --- | --- | --- |
| 태스크 | 리마인더 댓글 추가 | auto | 저위험, 되돌리기 쉬움 |
| 태스크 | 태스크 생성 | approve | 잘못된 태스크 생성 방지 |
| 태스크 | 태스크 상태 변경 | approve | 작업 흐름 영향 |
| 일정 | 리마인더 알림 | auto | 알림 전용, 변경 없음 |
| 일정 | 일정 이동 제안 | notify_only | 승인 필요 |
| 문서 | 자동 분류/태깅 | auto | 저위험, 되돌리기 쉬움 |
| 문서 | 회의록 생성 | auto | 추가 생성, 기존 데이터 변경 없음 |
| 인프라 | 비용 이상 알림 | auto | 알림 전용 |
| 인프라 | 리소스 스케일 조정 | approve | 비용 영향 |
| 보고서 | 일일/주간 요약 생성 | auto | 읽기 전용 |

---

## 4. Pi Harness SDK 통합

### 4.1 왜 Pi SDK인가

자율형 AI 비서의 핵심은 "이벤트 → AI 판단 → 도구 실행 → 결과 보고" 루프다. 이 에이전트 루프를 직접 구현하면 다음을 모두 자체 개발해야 한다:
- LLM 호출 + 스트리밍 관리
- 도구(tool) 등록 + 실행 + 결과 반환 루프
- 멀티 LLM 프로바이더 통합
- 세션 라이프사이클 관리
- 컨텍스트 윈도우 최적화

**Pi Harness SDK**는 이 모든 것을 경량 패키지로 제공한다. OpenClaw가 이미 Pi SDK를 SaaS 메시징 게이트웨이에 임베딩한 선례가 있다.

| 항목 | 직접 구현 | Pi SDK 활용 |
| --- | --- | --- |
| 에이전트 루프 | 자체 구현 (LLM 호출 → 도구 실행 → 반복) | `createAgentSession()` 한 줄 |
| 멀티 LLM | 프로바이더별 클라이언트 구현 | `ModelRegistry` (20+ 프로바이더) |
| 도구 등록 | 자체 스키마 정의 + 실행 핸들러 | Pi Tools 표준으로 주입 |
| 확장성 | 코드 직접 수정 | Skills/Extensions로 런타임 확장 |
| 시스템 프롬프트 | 하드코딩 | Prompt Templates로 동적 조합 |
| 개발 기간 | 4~6주 | 1~2주 |

### 4.2 적용 범위

Pi SDK는 **agent 모듈(자율형 AI 비서)**에만 적용한다. 기존 모듈은 현행 유지.

| 모듈 | Pi SDK 적용 | 근거 |
| --- | --- | --- |
| **agent** (자율 비서) | O | 에이전트 루프 + 도구 실행이 핵심 |
| haru (대화형 채팅) | X | Bedrock 직접 호출이 더 단순 |
| chatbot (RAG 챗봇) | X | RAG 파이프라인은 Pi 설계 목적과 불일치 |
| knowledge (임베딩) | X | Pi와 무관 |

### 4.3 통합 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                    agent 모듈 (NestJS)                           │
│                                                                  │
│  ┌──────────────┐    ┌──────────────────────────────────────┐   │
│  │ EventProcessor│───▶│         Pi AgentSession               │   │
│  │ (Sense)       │    │                                      │   │
│  └──────────────┘    │  ┌─────────┐  ┌──────────────────┐  │   │
│                       │  │ System  │  │  Custom Tools     │  │   │
│  ┌──────────────┐    │  │ Prompt  │  │  (HaruOS 전용)    │  │   │
│  │ PolicyService │◀──│  │ Template│  │                    │  │   │
│  │ (정책 확인)   │    │  └─────────┘  │  - clickup_tool   │  │   │
│  └──────────────┘    │               │  - schedule_tool   │  │   │
│                       │  ┌─────────┐  │  - document_tool   │  │   │
│  ┌──────────────┐    │  │ Model   │  │  - infra_tool      │  │   │
│  │ Notification │◀──│  │ Registry│  │  - notify_tool     │  │   │
│  │ Service       │    │  │ (LLM)  │  │  - approval_tool   │  │   │
│  └──────────────┘    │  └─────────┘  └──────────────────┘  │   │
│                       └──────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 NestJS + Pi SDK 통합 코드

```typescript
// agent-session.provider.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  createAgentSession,
  ModelRegistry,
  AgentSession,
} from '@mariozechner/pi-coding-agent';

@Injectable()
export class AgentSessionProvider implements OnModuleInit, OnModuleDestroy {
  private session: AgentSession;
  private modelRegistry: ModelRegistry;

  constructor(
    private readonly toolRegistry: AgentToolRegistry,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.modelRegistry = new ModelRegistry();

    // Bedrock을 기본 LLM으로 등록 (기존 HaruOS 인프라 활용)
    this.modelRegistry.register('bedrock-sonnet', {
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      // Bedrock 엔드포인트로 라우팅
    });

    this.modelRegistry.register('bedrock-haiku', {
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
    });
  }

  /**
   * 이벤트에 대한 에이전트 세션을 생성하고 판단을 실행한다.
   * 세션은 1회성 — 이벤트 처리 후 종료.
   */
  async processEvent(event: AgentEvent, context: EventContext): Promise<AgentDecision> {
    const session = await createAgentSession({
      modelRegistry: this.modelRegistry,
      tools: this.toolRegistry.getToolsForEvent(event),
      systemPrompt: this.buildSystemPrompt(context),
    });

    const result = await session.send(
      this.buildEventPrompt(event, context)
    );

    return this.parseDecision(result);
  }

  async onModuleDestroy() {
    // 세션 정리
  }
}
```

### 4.5 커스텀 도구 (HaruOS 전용 Tools)

Pi의 기본 4개 도구(read, write, edit, bash) 대신, HaruOS 업무 도메인에 맞는 커스텀 도구를 주입한다.

```typescript
// tools/clickup.tool.ts
export const clickupTool = {
  name: 'clickup',
  description: 'ClickUp 태스크 관리 (조회, 생성, 수정, 댓글 추가)',
  parameters: {
    action: { type: 'string', enum: ['get_tasks', 'create_task', 'update_task', 'add_comment'] },
    taskId: { type: 'string', optional: true },
    data: { type: 'object', optional: true },
  },
  async execute({ action, taskId, data }) {
    // ClickUp API 호출
  },
};

// tools/schedule.tool.ts
export const scheduleTool = {
  name: 'schedule',
  description: '일정 관리 (조회, 생성, 이동, 충돌 감지)',
  parameters: {
    action: { type: 'string', enum: ['get_events', 'create_event', 'move_event', 'detect_conflicts'] },
    date: { type: 'string', optional: true },
    data: { type: 'object', optional: true },
  },
  async execute({ action, date, data }) {
    // 캘린더 API 호출
  },
};

// tools/infra.tool.ts
export const infraTool = {
  name: 'infra',
  description: 'AWS 인프라 모니터링 및 관리 (비용 조회, 리소스 상태, 스케일 조정)',
  parameters: {
    action: { type: 'string', enum: ['get_costs', 'get_metrics', 'scale_service', 'get_alerts'] },
    service: { type: 'string', optional: true },
    data: { type: 'object', optional: true },
  },
  async execute({ action, service, data }) {
    // AWS SDK 호출 (STS AssumeRole)
  },
};

// tools/notify.tool.ts
export const notifyTool = {
  name: 'notify',
  description: '사용자에게 알림 발송 (카카오톡, Slack, 이메일, 앱 내)',
  parameters: {
    channel: { type: 'string', enum: ['kakao', 'slack', 'email', 'app'] },
    urgency: { type: 'string', enum: ['urgent', 'important', 'normal', 'info'] },
    message: { type: 'string' },
    actions: { type: 'array', optional: true },
  },
  async execute({ channel, urgency, message, actions }) {
    // 알림 채널별 발송
  },
};

// tools/approval.tool.ts
export const approvalTool = {
  name: 'request_approval',
  description: '사용자 승인이 필요한 액션을 승인 대기열에 추가',
  parameters: {
    title: { type: 'string' },
    description: { type: 'string' },
    proposed_action: { type: 'object' },
    expires_in_hours: { type: 'number', default: 24 },
  },
  async execute({ title, description, proposed_action, expires_in_hours }) {
    // 승인 대기열에 추가 + 사용자에게 승인 요청 알림
  },
};

// tools/document.tool.ts
export const documentTool = {
  name: 'document',
  description: '문서 관리 (조회, 분류, 요약 생성, 회의록 생성)',
  parameters: {
    action: { type: 'string', enum: ['search', 'classify', 'summarize', 'create_minutes'] },
    query: { type: 'string', optional: true },
    documentId: { type: 'string', optional: true },
    data: { type: 'object', optional: true },
  },
  async execute({ action, query, documentId, data }) {
    // 문서 모듈 서비스 호출
  },
};

// tools/report.tool.ts  
export const reportTool = {
  name: 'report',
  description: '리포트 생성 (일일 요약, 주간 리포트, 비용 분석)',
  parameters: {
    type: { type: 'string', enum: ['daily_summary', 'weekly_report', 'cost_analysis', 'task_health'] },
    period: { type: 'string', optional: true },
  },
  async execute({ type, period }) {
    // 리포트 생성 로직
  },
};
```

### 4.6 Pi Skills (업무 도메인별 에이전트 행동 정의)

Pi의 Skills는 Markdown 파일로 에이전트 행동을 정의한다. HaruOS 도메인별 Skill을 작성하여 에이전트의 판단 품질을 높인다.

```markdown
<!-- skills/task-management.md -->
# 태스크 관리 Skill

## 기한 임박 태스크 처리
- 기한 24시간 이내: 리마인더 댓글 자동 추가
- 기한 초과: 담당자에게 카카오톡 알림, 관리자에게 일일 요약 포함
- 3일 이상 미변경 태스크: 상태 확인 질문 댓글 추가

## 태스크 생성 판단
- 회의에서 도출된 액션 아이템 → 태스크 생성 제안 (승인 필요)
- 반복 패턴 감지 → 템플릿 기반 자동 생성 제안
- 절대로 태스크를 자동 삭제하지 않음

## 우선순위 판단
- 긴급 + 중요: 즉시 알림
- 긴급 + 비중요: 일괄 처리 제안
- 비긴급 + 중요: 일일 브리핑에 포함
```

```markdown
<!-- skills/cost-monitoring.md -->
# 비용 모니터링 Skill

## 이상 감지 기준
- 전일 대비 20% 이상 증가: 즉시 알림
- 주간 예산의 80% 도달: 경고 알림
- 미사용 리소스 감지: 주간 리포트에 정리 제안 포함

## 자율 실행 범위
- 비용 알림: 자동 (auto)
- 리소스 축소/중지: 반드시 승인 (approve)
- 리소스 생성: 절대 자동 금지
```

### 4.7 Pi Prompt Template (시스템 프롬프트 동적 조합)

```markdown
<!-- prompts/haru-agent.md -->
# 하루 자율형 AI 비서

당신은 HaruOS의 자율형 AI 비서 "하루"입니다.

## 역할
이벤트를 분석하고, 사용자의 업무를 선제적으로 지원합니다.

## 원칙
1. 사용자가 설정한 정책 범위 내에서만 행동
2. 확신도(confidence) 0.8 미만이면 자동 실행하지 않음
3. 데이터 삭제, 비용 발생, 외부 발송은 절대 자동 실행 금지
4. 모든 행동은 감사 로그에 기록

## 도구 사용 가이드
- `clickup`: 태스크 조회/생성/수정/댓글
- `schedule`: 일정 조회/생성/이동/충돌감지
- `document`: 문서 검색/분류/요약/회의록
- `infra`: AWS 비용/메트릭/스케일/알림
- `notify`: 사용자 알림 발송
- `request_approval`: 승인 필요 시 대기열 추가
- `report`: 리포트 생성

## 응답 형식
반드시 JSON으로 응답:
```json
{
  "importance": "high|medium|low",
  "urgency": "urgent|normal|low",
  "confidence": 0.85,
  "reasoning": "판단 근거",
  "proposed_actions": [...]
}
```
```

### 4.8 멀티 LLM Fallback (Pi ModelRegistry 활용)

기존 HaruOS의 Bedrock 멀티모델 fallback을 Pi의 ModelRegistry로 통합 관리한다.

```typescript
// agent-model.config.ts
export function configureModelRegistry(registry: ModelRegistry) {
  // Primary: Claude Sonnet (복잡한 판단)
  registry.register('primary', {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    via: 'bedrock',  // AWS Bedrock 경유
  });

  // Fallback 1: Claude Haiku (간단한 판단, 비용 절감)
  registry.register('fallback-fast', {
    provider: 'anthropic', 
    model: 'claude-haiku-4-5-20251001',
    via: 'bedrock',
  });

  // Fallback 2: 직접 API (Bedrock 장애 시)
  registry.register('fallback-direct', {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

// 이벤트 복잡도에 따른 모델 자동 선택
export function selectModel(event: AgentEvent): string {
  if (event.category === 'infra' || event.requiresMultiStep) {
    return 'primary';       // Sonnet: 복잡한 인프라 판단
  }
  return 'fallback-fast';   // Haiku: 단순 리마인더, 분류
}
```

---

## 5. 이벤트 처리 파이프라인

### 5.1 모듈 구조

```
apps/tenant-api/src/modules/agent/
├── agent.controller.ts              # 정책 설정 API, 승인 API
├── agent.service.ts                 # 자율 에이전트 메인 로직
├── agent-session.provider.ts        # Pi SDK 세션 관리 (NEW)
├── agent-tool.registry.ts           # 커스텀 도구 레지스트리 (NEW)
├── agent-event.processor.ts         # 이벤트 수신 + 분류
├── agent-decision.engine.ts         # AI 판단 엔진 (Pi Session 활용)
├── agent-executor.service.ts        # 액션 실행 (Act)
├── agent-notification.service.ts    # 알림 발송 (Notify)
├── agent-policy.service.ts          # 정책 관리
├── ports/
│   ├── event-source.port.ts         # 이벤트 소스 인터페이스
│   ├── action-executor.port.ts      # 액션 실행 인터페이스
│   └── notification-channel.port.ts # 알림 채널 인터페이스
├── adapters/
│   ├── clickup-event.adapter.ts     # ClickUp 이벤트 어댑터
│   ├── cloudwatch-event.adapter.ts  # CloudWatch 이벤트 어댑터
│   ├── calendar-event.adapter.ts    # 캘린더 이벤트 어댑터
│   ├── clickup-action.adapter.ts    # ClickUp 액션 실행
│   ├── aws-action.adapter.ts        # AWS 액션 실행
│   ├── kakao-notification.adapter.ts  # 카카오톡 알림
│   ├── slack-notification.adapter.ts  # Slack 알림
│   └── email-notification.adapter.ts  # 이메일 알림
├── tools/                           # Pi 커스텀 도구 (NEW)
│   ├── clickup.tool.ts
│   ├── schedule.tool.ts
│   ├── document.tool.ts
│   ├── infra.tool.ts
│   ├── notify.tool.ts
│   ├── approval.tool.ts
│   └── report.tool.ts
├── skills/                          # Pi Skills (NEW)
│   ├── task-management.md
│   ├── cost-monitoring.md
│   ├── schedule-management.md
│   └── document-processing.md
├── prompts/                         # Pi Prompt Templates (NEW)
│   └── haru-agent.md
├── dto/
│   ├── policy.request.dto.ts
│   ├── policy.response.dto.ts
│   ├── approval.request.dto.ts
│   └── action-log.response.dto.ts
├── entities/
│   ├── agent-policy.entity.ts
│   ├── agent-action-log.entity.ts
│   └── agent-approval-queue.entity.ts
└── agent.module.ts
```

### 4.2 이벤트 처리 흐름 (시퀀스)

```
[Event Source] ─webhook/poll─▶ [EventProcessor]
                                      │
                                      ▼
                              [컨텍스트 수집]
                              - 관련 태스크 조회
                              - 사용자 일정 조회
                              - 이전 유사 이벤트 패턴
                              - 사용자 선호도
                                      │
                                      ▼
                              [DecisionEngine]
                              - LLM에 컨텍스트 + 이벤트 전달
                              - 중요도/긴급도 판단
                              - 실행 계획 수립
                                      │
                                      ▼
                              [PolicyService]
                              - 해당 액션의 자율 수준 확인
                              - auto → 즉시 실행
                              - approve → 승인 대기열
                              - notify_only → 알림만
                                      │
                           ┌──────────┼──────────┐
                           ▼          ▼          ▼
                      [Executor]  [Approval]  [Notify]
                           │       Queue         │
                           ▼                     ▼
                      [ActionLog]          [Channel]
                                          카카오/Slack/이메일
```

---

## 6. AI 판단 엔진 (Decision Engine)

### 6.1 LLM 프롬프트 구조

```
[System]
당신은 HaruOS의 자율형 AI 비서 "하루"입니다.
이벤트를 분석하고, 적절한 대응 액션을 판단하세요.

판단 기준:
1. 중요도: 사용자의 업무에 미치는 영향 (high/medium/low)
2. 긴급도: 즉각 대응 필요 여부 (urgent/normal/low)
3. 자신감: 이 판단에 대한 확신도 (0.0~1.0)

응답 형식 (JSON):
{
  "importance": "high|medium|low",
  "urgency": "urgent|normal|low",
  "confidence": 0.85,
  "reasoning": "판단 근거 1~2문장",
  "proposed_actions": [
    {
      "type": "create_reminder",
      "target": "clickup",
      "params": { ... },
      "description": "사용자에게 표시할 액션 설명"
    }
  ]
}

[User]
이벤트: {event_type}
데이터: {event_data}

현재 컨텍스트:
- 사용자 태스크 현황: {tasks_summary}
- 오늘 일정: {today_schedule}
- 사용자 선호도: {preferences}
- 이전 유사 이벤트 처리 이력: {history}
```

### 6.2 자신감 기반 자동/수동 분기

```
confidence >= 0.8  →  정책 따름 (auto면 자동 실행)
confidence 0.5~0.8 →  notify_only로 격하 (사용자 확인 유도)
confidence < 0.5   →  skip (로그만 기록, 액션 없음)
```

---

## 7. 알림 채널 통합

### 7.1 메신저 연동

| 채널 | 연동 방식 | 양방향 | 비고 |
| --- | --- | --- | --- |
| 카카오톡 | Kakao i Open Builder | O | 알림 수신 + 승인/거부 응답 |
| Slack | Slack Bot API | O | 알림 + 인터랙티브 버튼으로 승인 |
| Discord | Discord Bot API | O | 알림 + 리액션으로 승인 |
| 이메일 | SES / Resend | X | 알림 전용 (일일 요약) |
| 앱 내 | WebSocket/SSE | O | 실시간 알림 + 전체 관리 |

### 7.2 양방향 메신저 인터랙션

```
[하루 → 카카오톡]
"내일 10시 팀 미팅과 11시 거래처 미팅이 겹칩니다.
 팀 미팅을 9시로 앞당길까요?

 1. 네, 앞당겨주세요
 2. 아니요, 거래처 미팅을 옮겨주세요
 3. 그냥 두세요"

[사용자 → 카카오톡]
"1"

[하루 → 자동 실행]
팀 미팅을 9시로 변경 → 참석자에게 변경 알림 발송
```

---

## 8. 배치 스케줄러 (Proactive Tasks)

### 8.1 기본 배치 작업

| 작업 | 주기 | 설명 |
| --- | --- | --- |
| 일일 업무 브리핑 | 매일 08:00 | 오늘 일정, 기한 임박 태스크, 어제 미처리 항목 |
| 주간 리포트 | 매주 월 09:00 | 지난 주 완료/생성 태스크 통계, 이번 주 핵심 일정 |
| 비용 분석 | 매일 06:00 | AWS 비용 전일 대비 변화, 이상 감지 |
| 문서 정리 제안 | 매주 금 17:00 | 미분류 문서, 오래된 문서 아카이브 제안 |
| 태스크 건강 체크 | 매일 09:00 | 기한 초과 태스크, 3일 이상 미변경 태스크 알림 |

### 8.2 사용자 패턴 학습

```
[패턴 감지]
"사용자가 매주 월요일 10시에 '주간 회의 회의록' 문서를 생성함"

[자율 제안]
"월요일 주간 회의 회의록 템플릿을 미리 준비할까요?
 지난 주 진행사항과 이번 주 아젠다를 자동으로 채워넣겠습니다."

[사용자 승인 후]
- 회의록 템플릿 자동 생성
- 지난 주 ClickUp 완료 태스크 자동 기입
- 이번 주 기한 태스크 아젠다에 추가
```

---

## 9. 보안 및 권한

### 9.1 자율 실행 보안 원칙

1. **최소 권한**: 자율 실행은 사용자가 명시적으로 허용한 범위 내에서만
2. **감사 추적**: 모든 자율 실행은 agent_action_logs에 기록
3. **되돌리기**: 가능한 모든 자율 액션에 롤백 메커니즘
4. **비용 상한**: 자율 실행으로 인한 AWS 비용에 일일 상한 설정
5. **킬스위치**: 사용자가 즉시 모든 자율 실행을 중단하는 글로벌 토글

### 9.2 민감 액션 보호

| 액션 | 보호 수준 | 설명 |
| --- | --- | --- |
| 데이터 삭제 | 절대 자동 금지 | 항상 사용자 승인 필요 |
| 비용 발생 액션 | 승인 필요 | AWS 리소스 생성/변경 |
| 외부 발송 | 승인 필요 | 이메일, 메시지 대외 발송 |
| 접근 권한 변경 | 절대 자동 금지 | IAM, 공유 설정 변경 |
| 태스크 읽기/댓글 | 자동 허용 | 저위험, 되돌리기 가능 |

---

## 10. 개발 로드맵

### Phase 3-A: 자율 에이전트 MVP

| 주차 | 작업 | 산출물 |
| --- | --- | --- |
| 1주 | Pi SDK 통합 + AgentSessionProvider 구현 | Pi 세션 관리 기반 |
| 2주 | 커스텀 도구 7종 구현 + Skills/Prompts 작성 | HaruOS 전용 도구셋 |
| 3~4주 | 이벤트 프로세서 + 정책 시스템 | ClickUp/CloudWatch 이벤트 + 정책 CRUD API |
| 5~6주 | 액션 실행기 + 승인 대기열 | 자율 실행 + 승인 플로우 |
| 7~8주 | 알림 시스템 (앱 내 + 이메일) + 멀티 LLM fallback | 기본 알림 채널 |

### Phase 3-B: 배치 + 메신저

| 주차 | 작업 | 산출물 |
| --- | --- | --- |
| 1~2주 | 배치 스케줄러 (일일 브리핑, 주간 리포트) | 자동 보고서 |
| 3~4주 | 카카오톡 연동 (양방향) | 메신저 알림 + 승인 |
| 5~6주 | Slack 연동 (양방향) | Slack Bot |
| 7~8주 | 사용자 패턴 학습 기본 | 반복 업무 감지 |

### Phase 4: 고급 자율화

| 주차 | 작업 | 산출물 |
| --- | --- | --- |
| 1~4주 | 멀티 이벤트 상관 분석 | 복합 이벤트 판단 |
| 5~8주 | 사용자 피드백 기반 정책 자동 조정 | 자가 개선 루프 |

---

## 11. KPI

| 지표 | 3개월 목표 | 6개월 목표 |
| --- | --- | --- |
| 일 평균 자율 실행 횟수 | 5건/테넌트 | 20건/테넌트 |
| 자율 실행 정확도 (사용자 피드백 기반) | > 80% | > 90% |
| 승인 요청 → 응답 시간 | < 30분 | < 15분 |
| 사용자 만족도 (자율 기능) | > 70% | > 85% |
| 메신저 연동 활성 사용자 | 30% | 60% |

---

## 12. 차별화 요소 (OpenClaw 대비)

| 항목 | OpenClaw | HaruOS 자율형 |
| --- | --- | --- |
| 실행 환경 | 로컬 머신 (always-on daemon) | 클라우드 SaaS (서버리스) |
| 에이전트 엔진 | Pi SDK 임베딩 (선례) | Pi SDK 임베딩 (동일 방식) |
| AI 모델 | 로컬 모델 + API | AWS Bedrock (멀티모델 fallback, Pi ModelRegistry) |
| 도구 체계 | 코딩 도구 (read/write/edit/bash) | 업무 도구 (clickup/schedule/document/infra/notify) |
| 자율 범위 | 개발 환경 자동화 | 업무 관리 전반 (태스크/일정/문서/인프라) |
| 메신저 연동 | 제한적 | 카카오톡/Slack/Discord/이메일 양방향 |
| 보안 | 로컬 실행으로 단순 | 테넌트 격리 + 정책 기반 권한 제어 |
| 타겟 | 개발자 | 비개발자 포함 전체 업무 사용자 |

---

_이 문서는 OpenClaw의 "항시 동작하는 AI 에이전트" 컨셉을 HaruOS의 업무 관리 도메인에 적용한 설계이다. 핵심은 Sense → Think → Act → Notify 루프와, 사용자가 자율 범위를 세밀하게 제어할 수 있는 정책 시스템이다._
