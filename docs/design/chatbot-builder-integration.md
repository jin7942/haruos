# HaruOS 고도화: AI 챗봇 빌더 통합 (Miso 컨셉)

| 버전 | 변경내용 | 작성자 | 수정일 |
| --- | --- | --- | --- |
| v1.0 | 초기 작성 - Miso 기획안 기반 HaruOS 통합 설계 | 김진범 | 2026-05-13 |

> **상태:** 고도화 예정 (Phase 3+)
> **원본:** Miso 사업 기획안 v1.1 (2026-03)
> **목적:** HaruOS 테넌트에 AI 챗봇 빌더 기능을 추가하여, 테넌트 사용자가 자사 문서 기반 고객 응대 챗봇을 생성/배포할 수 있도록 한다.

---

## 1. 통합 개요

### 1.1 왜 HaruOS에 챗봇 빌더를 통합하는가

HaruOS는 이미 다음 인프라를 보유하고 있다:
- **RAG 파이프라인**: pgvector + Amazon Titan Embeddings + Bedrock LLM
- **문서 관리 모듈**: 파일 업로드 → S3 저장 → 임베딩 → 벡터 검색
- **테넌트 격리 아키텍처**: 테넌트별 독립 DB + 인프라
- **Stripe 결제 시스템**: 구독 과금 인프라

Miso(AI 챗봇 빌더)의 핵심 기술 스택이 HaruOS와 거의 동일하므로, 별도 서비스 대신 HaruOS의 고도화 기능으로 통합하는 것이 효율적이다.

### 1.2 통합 방향

| 항목 | Miso (독립 서비스) | HaruOS 통합 |
| --- | --- | --- |
| 인프라 | 별도 서버/DB | 테넌트 인프라 재사용 |
| 임베딩 | Amazon Titan (별도) | 기존 knowledge 모듈 RAG 파이프라인 공유 |
| LLM | Bedrock (별도) | 기존 haru 모듈 ai-gateway 포트 공유 |
| 결제 | 포트원/토스 | 기존 Stripe billing 모듈 확장 |
| 사용자 인증 | 별도 회원 시스템 | 기존 테넌트 OTP 인증 활용 |
| 벡터 DB | pgvector (별도) | 테넌트 DB 내 pgvector 공유 |

---

## 2. 기능 정의

### 2.1 챗봇 빌더 (tenant-api 확장)

| ID | 기능 | 설명 | Phase |
| --- | --- | --- | --- |
| CB-001 | 챗봇 프로젝트 생성 | 챗봇 이름, 설명, 브랜드 설정으로 프로젝트 생성 | P3 |
| CB-002 | 문서 업로드 | PDF, DOCX, TXT, CSV, Markdown, 웹페이지 URL 크롤링 지원 | P3 |
| CB-003 | 자동 RAG 구성 | 문서 파싱 → 청킹 → 임베딩 → 벡터 저장 자동 처리 | P3 |
| CB-004 | 챗봇 테스트 | 대시보드 내 챗봇 테스트 채팅 UI | P3 |
| CB-005 | 위젯 커스터마이징 | 브랜드 색상, 로고, 환영 메시지, 위치 설정 | P3 |
| CB-006 | 위젯 코드 생성 | `<script>` 태그 1줄로 외부 웹사이트 삽입 | P3 |
| CB-007 | 분석 대시보드 | 질문 수, 응답 성공률, 인기 질문, 미답변 질문 모니터링 | P3 |
| CB-008 | 모델 선택 | Haiku(기본) / Sonnet(상위) / BYOK(사용자 키) 선택 | P3 |

### 2.2 메신저 연동 (Phase 4)

| ID | 기능 | 설명 | Phase |
| --- | --- | --- | --- |
| CB-MSG-001 | 카카오톡 채널 연동 | Kakao i Open Builder API 연동 | P4 |
| CB-MSG-002 | 네이버 톡톡 연동 | 네이버 톡톡 챗봇 API 연동 | P4 |
| CB-MSG-003 | Slack 연동 | Slack Bot API 연동 | P4 |
| CB-MSG-004 | Discord 연동 | Discord Bot API 연동 | P4 |
| CB-MSG-005 | Webhook/Zapier | 미답변 질문 발생 시 외부 서비스 전달 | P4 |

### 2.3 고급 기능 (Phase 4+)

| ID | 기능 | 설명 | Phase |
| --- | --- | --- | --- |
| CB-ADV-001 | 응답 캐싱 | Redis 기반 동일/유사 질문 캐싱 (API 비용 40~60% 절감) | P4 |
| CB-ADV-002 | 모델 라우팅 | 간단한 질문은 Haiku, 복잡한 질문은 Sonnet 자동 분기 | P4 |
| CB-ADV-003 | 다국어 자동 감지 | 한국어/영어/일본어/중국어 자동 감지 및 응답 | P4 |
| CB-ADV-004 | 멀티 에이전트 | 역할별 챗봇 분리 (CS, 영업, 기술지원) | P4+ |
| CB-ADV-005 | API 제공 | B2B 고객용 챗봇 API 엔드포인트 | P4+ |

---

## 3. 아키텍처 설계

### 3.1 모듈 구조

기존 tenant-api에 `chatbot` 모듈을 추가한다.

```
apps/tenant-api/src/modules/chatbot/
├── chatbot.controller.ts          # 챗봇 CRUD + 위젯 설정 API
├── chatbot.service.ts             # 챗봇 비즈니스 로직
├── chatbot-document.service.ts    # 문서 처리 파이프라인
├── chatbot-widget.service.ts      # 위젯 코드 생성 + 서빙
├── chatbot-analytics.service.ts   # 분석 대시보드 집계
├── ports/
│   └── chatbot-embedding.port.ts  # 임베딩 포트 (knowledge 모듈 재사용)
├── adapters/
│   └── bedrock-embedding.adapter.ts
├── dto/
│   ├── create-chatbot.request.dto.ts
│   ├── chatbot.response.dto.ts
│   ├── widget-config.request.dto.ts
│   └── analytics.response.dto.ts
├── entities/
│   ├── chatbot.entity.ts
│   ├── chatbot-document.entity.ts
│   ├── chatbot-conversation.entity.ts
│   └── chatbot-message.entity.ts
└── chatbot.module.ts
```

### 3.2 위젯 서빙 아키텍처

```
[외부 웹사이트]
    │
    │ <script src="https://{tenant}.haruos.app/widget/{chatbot-id}.js">
    │
    ▼
[Widget JS] ──SSE──▶ [tenant-api] ──▶ [RAG Pipeline] ──▶ [Bedrock LLM]
    │                      │
    │                      ▼
    │                [chatbot_documents] ──pgvector──▶ [벡터 검색]
    │                      │
    ▼                      ▼
[채팅 UI iframe]    [chatbot_conversations + messages]
```

### 3.3 데이터 모델

```sql
-- 챗봇 프로젝트
CREATE TABLE chatbots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    widget_config JSONB DEFAULT '{}',
    model_type VARCHAR(20) DEFAULT 'HAIKU',
    monthly_question_limit INT DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 챗봇 문서 (RAG 소스)
CREATE TABLE chatbot_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    file_size BIGINT NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    chunk_count INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PROCESSING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 챗봇 문서 청크 (벡터 저장)
CREATE TABLE chatbot_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES chatbot_documents(id) ON DELETE CASCADE,
    chatbot_id UUID NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chatbot_chunks_embedding ON chatbot_chunks
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 챗봇 대화
CREATE TABLE chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE,
    visitor_id VARCHAR(100),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- 챗봇 메시지
CREATE TABLE chatbot_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL,  -- 'user' | 'assistant'
    content TEXT NOT NULL,
    sources JSONB DEFAULT '[]',
    feedback VARCHAR(10),       -- 'positive' | 'negative' | NULL
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.4 widget_config JSONB 구조

```json
{
  "theme": {
    "primaryColor": "#6366f1",
    "backgroundColor": "#ffffff",
    "textColor": "#1f2937",
    "borderRadius": 12
  },
  "branding": {
    "name": "고객 지원 AI",
    "logoUrl": "https://...",
    "welcomeMessage": "안녕하세요! 무엇을 도와드릴까요?",
    "placeholder": "질문을 입력하세요..."
  },
  "position": "bottom-right",
  "language": "auto",
  "watermark": true
}
```

---

## 4. HaruOS 기존 모듈 재사용 매핑

| Miso 기능 | HaruOS 기존 모듈 | 재사용 방식 |
| --- | --- | --- |
| 문서 파싱 + 임베딩 | knowledge 모듈 (embedding port) | 포트 인터페이스 공유, 챗봇용 벡터 테이블 분리 |
| LLM 응답 생성 | haru 모듈 (ai-gateway port) | 동일 Bedrock 어댑터 재사용 |
| 파일 업로드 → S3 | file 모듈 (storage port) | S3 어댑터 공유 |
| 사용량 과금 | billing 모듈 (Stripe) | 애드온 요금제로 확장 |
| 사용자 인증 | auth 모듈 (JWT + OTP) | 기존 인증 체계 그대로 |
| 실시간 채팅 | haru 모듈 (SSE 스트리밍) | SSE 스트리밍 패턴 재사용 |

---

## 5. 요금제 확장

기존 HaruOS 테넌트 구독($19/월)에 챗봇 빌더를 애드온으로 추가한다.

| 항목 | Free (기본 포함) | Pro Add-on | Business Add-on |
| --- | --- | --- | --- |
| 월 추가 요금 | $0 | $9/월 | $19/월 |
| 챗봇 수 | 1개 | 5개 | 무제한 |
| 문서 업로드 | 1개 (5MB) | 20개 (200MB) | 무제한 (2GB) |
| 월 질문 횟수 | 100회 | 5,000회 | 30,000회 |
| LLM 모델 | Haiku | Haiku + Sonnet | 전체 + BYOK |
| 위젯 커스텀 | 기본 | 전체 | 전체 |
| 메신저 연동 | - | 카카오톡 | 전체 |
| 워터마크 | 있음 | 제거 가능 | 제거 |
| 분석 대시보드 | 기본 | 상세 | 상세 + 내보내기 |

---

## 6. API 비용 구조

LLM API 비용은 HaruOS 운영자가 부담하며, 사용량 제한 + 캐싱으로 통제한다.

| 항목 | 비용 (건당) | 캐싱 후 | 비고 |
| --- | --- | --- | --- |
| Haiku 응답 | ~7원 | ~3.5원 | 캐시 적중률 50% 가정 |
| Sonnet 응답 | ~60원 | ~30원 | 캐시 적중률 50% 가정 |
| 임베딩 (문서 처리) | ~0.5원/청크 | - | 최초 업로드 시만 |

### 비용 최적화 전략

1. **응답 캐싱**: Redis 기반 동일/유사 질문 캐싱 → API 호출 40~60% 감소
2. **모델 라우팅**: 간단한 질문은 Haiku, 복잡한 질문만 Sonnet 자동 분기
3. **토큰 제한**: 입력/출력 토큰 수 제한으로 불필요한 비용 방지
4. **BYOK**: Business 플랜에서 사용자 자체 API 키 입력 지원 → API 비용 부담 0

---

## 7. 위젯 기술 구현

### 7.1 삽입 코드

```html
<!-- HaruOS Chatbot Widget -->
<script
  src="https://{tenant-domain}/api/chatbot/widget/{chatbot-id}.js"
  data-chatbot-id="{chatbot-id}"
  async>
</script>
```

### 7.2 위젯 동작 흐름

1. 스크립트 로드 → Shadow DOM으로 위젯 UI 렌더링 (호스트 사이트 CSS 간섭 방지)
2. 사용자 클릭 → 채팅 패널 오픈
3. 질문 입력 → tenant-api SSE 엔드포인트로 스트리밍 요청
4. 서버: 질문 임베딩 → pgvector 유사도 검색 → 컨텍스트 구성 → LLM 응답 스트리밍
5. 위젯: SSE 스트림 수신 → 실시간 타이핑 효과로 응답 표시
6. 출처 표시: 참조한 문서 청크의 원본 문서명 + 페이지 번호

### 7.3 할루시네이션 방지

```
시스템 프롬프트 핵심:
- 제공된 문서 내용에만 기반하여 답변하세요.
- 문서에 관련 내용이 없으면 "해당 내용은 등록된 문서에서 찾을 수 없습니다."로 응답하세요.
- 추측이나 일반 지식으로 답변하지 마세요.
- 답변 시 참조한 문서명을 함께 제공하세요.
```

---

## 8. 한국 시장 특화 (Miso 차별화 계승)

| 항목 | 설명 |
| --- | --- |
| 카카오톡 채널 연동 | Kakao i Open Builder API로 카카오 비즈니스 채널에 챗봇 배포 |
| 네이버 톡톡 연동 | 네이버 톡톡 챗봇 API로 네이버 스마트스토어 CS 자동화 |
| 국내 결제 | 기존 Stripe + 포트원/토스페이먼츠 국내 결제 추가 (Phase 4+) |
| 한국어 최적화 | Claude 한국어 성능 활용, 한국어 청킹 전략 (형태소 분석) |

---

## 9. 타겟 고객 (HaruOS 확장)

### 기존 HaruOS 고객 (업무 관리 → 고객 응대 확장)
- HaruOS로 내부 업무를 관리하는 기업이, 동일 플랫폼에서 고객 응대 챗봇도 운영
- 추가 서비스 가입/학습 없이 기존 문서 자산 활용

### 신규 고객 유입
- **온라인 쇼핑몰 운영자**: 반복 CS 문의 자동화 니즈
- **중소기업 CS/마케팅**: 1~10명 규모 CS 팀 자동화
- **병원/학원/부동산**: 예약 안내, 문의 자동 응답
- **프리랜서/에이전시**: 고객사 웹사이트에 챗봇 구축 대행

---

## 10. 개발 로드맵

### Phase 3 (챗봇 빌더 MVP)

| 주차 | 작업 | 산출물 |
| --- | --- | --- |
| 1~2주 | chatbot 모듈 구현 (CRUD + 문서 업로드 + RAG 구성) | chatbot API |
| 3주 | 위젯 JS 개발 (Shadow DOM + SSE 스트리밍) | 챗봇 위젯 v1 |
| 4주 | 분석 대시보드 + 테스트 채팅 UI | 대시보드 v1 |
| 5~6주 | 위젯 커스터마이징 + 사용량 과금 연동 | 유료 기능 |

### Phase 4 (메신저 연동 + 고급 기능)

| 주차 | 작업 | 산출물 |
| --- | --- | --- |
| 1~2주 | 카카오톡 채널 연동 | 카카오 챗봇 |
| 3주 | 네이버 톡톡 연동 | 네이버 챗봇 |
| 4주 | 응답 캐싱 시스템 (Redis) | 비용 최적화 |
| 5~6주 | 모델 라우팅 + BYOK + 다국어 | 고급 기능 |

---

## 11. 리스크 및 대응

| 리스크 | 위험도 | 대응 |
| --- | --- | --- |
| LLM API 비용 급등 | 중 | 멀티 LLM 지원, 캐싱 강화, BYOK 제공 |
| 할루시네이션 | 중 | 프롬프트 설계 강화, 사용자 피드백 반영, 출처 표시 필수 |
| 위젯 성능 | 낮 | Shadow DOM 격리, 지연 로드, CDN 배포 |
| 개인정보 보호 | 높 | 테넌트 격리, 데이터 암호화, 이용약관 정비 |
| 외부 웹사이트 호환성 | 중 | Shadow DOM으로 CSS 충돌 방지, 주요 브라우저 테스트 |

---

## 12. KPI

| 지표 | 3개월 목표 | 6개월 목표 |
| --- | --- | --- |
| 챗봇 빌더 활성 테넌트 수 | 10개 | 50개 |
| 월 챗봇 질문 처리량 | 10,000건 | 100,000건 |
| 챗봇 응답 만족도 | > 70% | > 85% |
| Pro/Business 전환율 | 15% | 25% |
| 평균 응답 시간 | < 5초 | < 2초 |

---

_이 문서는 Miso 사업 기획안(v1.1)을 HaruOS 고도화 기능으로 재설계한 것이다. 원본 기획의 시장 분석, 재무 계획은 HaruOS 전체 사업 계획에 통합하여 관리한다._
