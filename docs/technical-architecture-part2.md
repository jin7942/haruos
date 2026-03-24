# HaruOS 기술 아키텍처 문서 (Part 2)

| 버전 | 변경내용 | 작성자 | 수정일 |
| --- | --- | --- | --- |
| v1.1 | CI/CD, 테스트 전략 섹션 추가 | 김진범 | 2026-03-24 |
| v1.0 | 초기 작성 (섹션 6~11) | 김진범 | 2026-03-22 |

> 이 문서는 [docs/technical-architecture.md](./technical-architecture.md)의 후속 문서입니다.
>
> Part 1 목차: 시스템 개요, 아키텍처, console-api 모듈 상세, tenant-api 모듈 상세, RAG 상세, 에이전트 모듈 상세

---

## 6. 실시간 통신

HaruOS의 실시간 통신은 두 채널로 구성된다.

| 채널 | 프로토콜 | 용도 | 적용 |
| --- | --- | --- | --- |
| SSE | HTTP 단방향 스트리밍 | AI 대화 응답, 프로비저닝 진행 | `@Sse()` 데코레이터 |
| WebSocket | Socket.IO 양방향 | 알림 (배치 완료, 비용 초과 등) | `@WebSocketGateway()` |

### 6.1 SSE 스트리밍

#### 대화 스트리밍 (tenant-api)

`POST /haru/chat/stream`으로 메시지를 전송하면 `Observable<MessageEvent>`를 SSE로 반환한다.

```typescript
// apps/tenant-api/src/haru/haru.controller.ts
@Post('chat/stream')
@Sse()
async chatStream(
  @Body() dto: ChatRequestDto,
  @Req() req: Request,
): Promise<Observable<MessageEvent>> {
  const userId = (req as any).user.sub;
  return this.orchestrator.processMessageStream(userId, dto);
}
```

SSE 이벤트 타입:

| 이벤트 | 데이터 | 설명 |
| --- | --- | --- |
| `meta` | `{ conversationId, agent }` | 스트리밍 시작, 대화 ID 전달 |
| `chunk` | 텍스트 문자열 | AI 응답의 토큰 단위 청크 |
| `done` | `{ conversationId }` | 스트리밍 완료 |
| `error` | 에러 메시지 | 오류 발생 |

#### 프로비저닝 스트리밍 (console-api)

`GET /tenants/:tenantId/provision/status/stream`으로 프로비저닝 단계별 진행 상황을 스트리밍한다.

```typescript
// apps/console-api/src/modules/provisioner/provisioner.controller.ts
@Get('status/stream')
@Sse()
streamStatus(@Param('tenantId') tenantId: string): Observable<MessageEvent> {
  return this.provisionerFacade.streamStatus(tenantId);
}
```

프로비저닝 SSE 이벤트 타입:

| 이벤트 | 데이터 | 설명 |
| --- | --- | --- |
| `status` | `ProvisioningJobResponse` | 단계 변경 (currentStep, completedSteps 등) |
| `log` | `ProvisioningLogResponse` | 단계별 로그 메시지 |
| `done` | `{ status }` | 프로비저닝 완료 |
| `error` | 에러 메시지 | 오류 발생 |

#### nginx SSE 설정

SSE가 정상 작동하려면 nginx에서 버퍼링을 비활성화해야 한다.

```nginx
# infra/docker/nginx/console.conf
location /api/ {
    proxy_pass http://console-api:3000;
    proxy_http_version 1.1;
    proxy_buffering off;   # SSE 필수
    proxy_cache off;
}
```

### 6.2 WebSocket Gateway

tenant-api와 console-api 각각 독립된 WebSocket Gateway를 운영한다. Socket.IO 기반이며 namespace로 분리한다.

| Gateway | namespace | 대상 | 알림 유형 |
| --- | --- | --- | --- |
| `HaruGateway` | `/ws/haru` | 테넌트 사용자 | batch_completed, file_processed |
| `ConsoleGateway` | `/ws/console` | 관리자 | provisioning_status, cost_alert |

#### 인증 흐름

연결 시 JWT 토큰을 검증한다. 토큰은 3가지 경로로 전달 가능하다.

```typescript
// apps/tenant-api/src/haru/haru.gateway.ts
handleConnection(client: Socket): void {
  const token =
    (client.handshake.query.token as string) ||
    client.handshake.auth?.token ||
    client.handshake.headers.authorization?.replace('Bearer ', '');

  if (!token) { client.disconnect(); return; }

  const payload = this.jwtService.verify(token);
  const userId = payload.sub;
  (client as any).userId = userId;
  client.join(`user:${userId}`);  // 사용자별 room
}
```

#### 사용자별 알림 전송

`userId -> socketId` 매핑을 `Map<string, Set<string>>`으로 관리하여 특정 사용자에게 알림을 전송한다.

```typescript
sendNotification(userId: string, type: string, data: Record<string, unknown>): void {
  this.server.to(`user:${userId}`).emit('notification', {
    type, data, timestamp: new Date().toISOString(),
  });
}
```

알림 메시지 형식 (`WsNotification`):

```typescript
interface WsNotification {
  type: string;                    // 알림 유형
  data: Record<string, unknown>;   // 알림 데이터
  timestamp: string;               // ISO 8601
}
```

### 6.3 프론트엔드 SSE 수신 (useStreamMessage)

`useStreamMessage` 훅은 SSE 스트리밍을 수신하여 AI 응답을 청크 단위로 점진적 렌더링한다.

```typescript
// apps/tenant-web/src/hooks/useHaru.ts
export function useStreamMessage() {
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback((message, conversationId, onConversationCreated?) => {
    setIsStreaming(true);
    setStreamingContent('');

    abortRef.current = haruApi.streamChat(message, conversationId, {
      onMeta: (meta) => { /* 새 대화 ID 처리 */ },
      onChunk: (chunk) => { setStreamingContent((prev) => prev + chunk); },
      onDone: (done) => {
        setIsStreaming(false);
        queryClient.invalidateQueries({ queryKey: ['messages', done.conversationId] });
      },
      onError: () => { setIsStreaming(false); },
    });
  }, [queryClient]);

  const cancel = useCallback(() => { abortRef.current?.abort(); }, []);
  return { send, cancel, streamingContent, isStreaming };
}
```

핵심 동작:
- `onChunk` 콜백에서 `setStreamingContent(prev => prev + chunk)`로 점진적 축적
- 완료 시 TanStack Query 캐시 무효화로 서버 데이터와 동기화
- `AbortController`로 사용자가 스트리밍 중단 가능

### 6.4 프론트엔드 WebSocket (useWebSocket)

console-web과 tenant-web 각각 `useWebSocket` 훅을 제공한다. 지수 백오프(exponential backoff) 재연결을 지원한다.

```typescript
// apps/tenant-web/src/hooks/useWebSocket.ts
const INITIAL_DELAY = 1000;
const MAX_DELAY = 30000;
const BACKOFF_FACTOR = 2;
// 재연결 지연: 1초 → 2초 → 4초 → 8초 → ... → 최대 30초

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { namespace = '/ws/haru', onNotification, autoConnect = true } = options;
  // ...
  const socket = io(namespace, {
    query: { token },           // JWT 토큰 전달
    transports: ['websocket'],  // polling 없이 WS만 사용
  });

  socket.on('notification', (notification: WsNotification) => {
    onNotificationRef.current?.(notification);
  });
  // ...
  return { connectionState, connect, disconnect, socket };
}
```

연결 상태(`WsConnectionState`): `'connected'` | `'disconnected'` | `'reconnecting'`

nginx 개발 환경에서 WebSocket 프록시 설정:

```nginx
# infra/docker/nginx/console-dev.conf
location /ws/ {
    proxy_pass http://console-api:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
}
```

---

## 7. 프론트엔드 아키텍처

### 7.1 console-web (관리 콘솔)

관리자/사용자가 테넌트를 생성·관리하는 SPA. React + React Router + TanStack Query.

#### 라우팅 구조

```
/ ........................ LandingPage (공개)
/login ................... LoginPage (공개)
/signup .................. SignupPage (공개)
/verify-email ............ VerifyEmailPage (공개)

[ProtectedRoute]
  [AppLayout]
    /dashboard ........... DashboardPage
    /tenants/new ......... CreateTenantPage
    /tenants/:id ......... TenantDetailPage
    /tenants/:id/monitoring  MonitoringPage
    /tenants/:id/settings    SettingsPage
    /account ............. AccountPage
    /account/billing ..... AccountBillingPage

    [AdminRoute]
      /admin/dashboard ... AdminDashboardPage
      /admin/tenants ..... AdminTenantsPage
      /admin/users ....... AdminUsersPage

/* ...................... → /dashboard (리다이렉트)
```

`ProtectedRoute`는 인증 여부를 확인하고, `AdminRoute`는 `role === 'ADMIN'`인 경우만 접근을 허용한다.

#### 커스텀 훅 (데이터 패칭)

| 훅 | 파일 | 용도 |
| --- | --- | --- |
| `useAuth` | hooks/useAuth.ts | AuthContext 접근 |
| `useTenants` | hooks/useTenants.ts | 테넌트 CRUD |
| `useProvisioner` | hooks/useProvisioner.ts | 프로비저닝 상태/SSE |
| `useMonitoring` | hooks/useMonitoring.ts | 메트릭, 비용 조회 |
| `useDomains` | hooks/useDomains.ts | 도메인 관리 |
| `useWebSocket` | hooks/useWebSocket.ts | WS 알림 (namespace: `/ws/console`) |
| `useBackups` | hooks/useBackups.ts | 백업 관리 |
| `useBilling` | hooks/useBilling.ts | 구독, 인보이스 |
| `useAws` | hooks/useAws.ts | AWS 자격증명 |

### 7.2 tenant-web (테넌트 앱)

테넌트 사용자가 Haru AI 비서와 대화하고, 프로젝트·일정·문서를 관리하는 SPA.

#### 라우팅 구조

```
/login .................. LoginPage (공개)

[ProtectedRoute → AppLayout]
  /dashboard ............ DashboardPage
  /chat ................. ChatPage (새 대화)
  /chat/:conversationId . ChatPage (기존 대화)
  /projects ............. ProjectsPage
  /schedules ............ SchedulePage
  /documents ............ DocumentsPage
  /knowledge ............ KnowledgePage
  /files ................ FilesPage
  /batch ................ BatchPage

/* .................... → /chat (리다이렉트)
```

#### 대화 UI 컴포넌트

```
ChatPage
├── ConversationList      # 좌측 대화 목록 패널
│   ├── 새 대화 버튼
│   └── 대화 항목 (title, updatedAt)
└── ChatView              # 우측 대화 영역
    ├── MessageList       # 메시지 목록 (자동 하단 스크롤)
    │   ├── MessageBubble # 개별 말풍선
    │   │   └── MarkdownContent  # 마크다운 렌더링
    │   └── 타이핑 인디케이터 (bounce 애니메이션)
    └── MessageInput      # 입력 (Enter 전송, Shift+Enter 줄바꿈)
```

`ChatView`는 `useStreamMessage` 훅을 사용하여 SSE 응답을 점진적으로 렌더링한다. 스트리밍 중에는 기존 메시지 목록에 임시 사용자 메시지와 스트리밍 AI 응답을 추가한다.

```typescript
// 스트리밍 중 표시 메시지 구성
const displayMessages = [...messages];
if (isStreaming) {
  displayMessages.push({ id: 'pending-user', role: 'user', content: pendingMessage });
  if (streamingContent) {
    displayMessages.push({ id: 'streaming-assistant', role: 'assistant', content: streamingContent });
  }
}
```

`MessageBubble`은 자체 마크다운 렌더러를 포함한다:
- 코드 블록 (```)
- 인라인 코드, bold, italic
- 리스트 항목
- 사용자 메시지: 우측 파란색 / AI 메시지: 좌측 회색

#### 커스텀 훅 (데이터 패칭)

| 훅 | 용도 |
| --- | --- |
| `useConversations`, `useMessages`, `useSendMessage`, `useStreamMessage` | Haru 대화 |
| `useProjects` | 프로젝트 관리 |
| `useSchedules` | 일정 관리 |
| `useDocuments` | 문서 관리 |
| `useKnowledge` | 지식 검색/RAG |
| `useFiles` | 파일 관리 |
| `useBatch` | 배치 작업 |
| `useStats` | 대시보드 통계 |
| `useWebSocket` | WS 알림 (namespace: `/ws/haru`) |

### 7.3 상태 관리

#### AuthContext

console-web과 tenant-web 모두 `AuthContext`로 인증 상태를 관리한다.

| 항목 | console-web | tenant-web |
| --- | --- | --- |
| 사용자 타입 | `UserSummary` (id, email, name, role) | `TenantUserSummary` (id, email, name, tenantId) |
| 저장 위치 | localStorage (토큰 + 사용자 JSON) | localStorage (토큰 + 사용자 JSON) |
| 토큰 키 | `haruos_access_token`, `haruos_refresh_token` | 동일 |
| 복원 방식 | 앱 마운트 시 localStorage에서 토큰 + 사용자 정보 복원 | 동일 |

#### TanStack Query 설정

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,           // 1회 재시도
      staleTime: 60_000,  // 1분간 fresh 유지
      refetchOnWindowFocus: false,
    },
  },
});
```

### 7.4 API 클라이언트 패턴

console-web과 tenant-web은 `@haruos/shared-utils`의 `createApiClient`를 사용하여 API 클라이언트를 생성한다. 토큰 갱신, 에러 정규화가 자동으로 처리된다.

```typescript
// apps/console-web/src/api/client.ts
export const apiClient = createApiClient({
  baseURL: '/api',
  getAccessToken,
  getRefreshToken,
  onTokenRefreshed: (accessToken) => { localStorage.setItem(TOKEN_KEY, accessToken); },
  onAuthFailed: () => { clearTokens(); window.location.href = '/login'; },
});
```

자세한 내부 동작은 섹션 8.2에서 설명한다.

---

## 8. 공유 패키지

모노레포 내 `packages/` 디렉터리에 프론트엔드·백엔드가 공유하는 패키지가 있다.

### 8.1 shared-types

프론트엔드와 백엔드가 공유하는 TypeScript 타입 정의. API 요청/응답의 계약(contract)을 보장한다.

```
packages/shared-types/src/
├── index.ts
├── api-response.ts       # ApiResponse<T> — 공통 응답 형식
├── pagination.ts         # PaginatedResponse<T>
├── auth.types.ts         # UserSummary, LoginResponse, TenantUserSummary, OtpResponse
├── tenant.types.ts       # TenantResponse
├── haru.types.ts         # ChatResponse, ConversationResponse, MessageResponse, ChatStreamMeta/Done, BatchJobResponse
├── agent.types.ts        # ProjectSyncResponse, ScheduleResponse, DocumentResponse, KnowledgeSearchResponse, FileRecordResponse
├── provisioner.types.ts  # ProvisioningJobResponse, ProvisioningLogResponse
├── monitoring.types.ts   # MetricResponse, CostResponse, AiUsageResponse, AlertConfigResponse
├── domain.types.ts       # DomainResponse
├── aws.types.ts          # CfnTemplateUrlResponse, CfnLaunchUrlResponse, AwsCredentialResponse
├── billing.types.ts      # SubscriptionResponse, InvoiceItem
├── backup.types.ts       # BackupResponse, BackupDownloadResponse
└── websocket.types.ts    # WsNotification, WsConnectionState
```

핵심 타입:

```typescript
// 공통 응답 형식 — 모든 REST API의 응답 래퍼
interface ApiResponse<T = unknown> {
  success: boolean;
  code: string;       // "OK" 또는 에러코드
  message: string;
  data: T;
  timestamp: string;  // ISO 8601
}

// 페이징 응답 — ApiResponse.data에 포함
interface PaginatedResponse<T> {
  items: T[];
  page: number;        // 0-indexed
  pageSize: number;
  totalCount: number;
}
```

### 8.2 shared-utils

프론트엔드 앱이 공유하는 유틸리티.

```
packages/shared-utils/src/
├── index.ts
├── api-client.ts    # createApiClient — Axios 기반 API 클라이언트 팩토리
└── date.ts          # formatDate, formatDateTime, timeAgo
```

#### createApiClient

Axios 인스턴스를 생성하며 3가지 기능을 내장한다.

**1) Request 인터셉터 — Bearer 토큰 자동 주입**

```typescript
instance.interceptors.request.use((config) => {
  const token = options.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

**2) Response 인터셉터 — ApiResponse 언래핑 + 에러 정규화**

```typescript
// 성공 응답: ApiResponse에서 data 추출
(response) => {
  const body = response.data as ApiResponse<unknown>;
  if (body && 'success' in body) response.data = body.data;
  return response;
}

// 에러 응답: AxiosError → ApiError 정규화
interface ApiError {
  code: string;     // 서버 에러코드 또는 'NETWORK_ERROR'
  message: string;
  status: number;
}
```

**3) 401 자동 갱신 — Refresh Token으로 Access Token 재발급**

```
401 발생 → refresh token 존재?
  ├─ No → onAuthFailed() (로그인 페이지 이동)
  └─ Yes → POST /auth/refresh
       ├─ 성공 → 새 토큰 저장 + 원래 요청 재시도
       └─ 실패 → onAuthFailed()
```

동시에 여러 요청이 401을 받아도 refresh는 1회만 실행한다. 나머지 요청은 대기 후 새 토큰으로 재시도한다.

#### 날짜 유틸리티

```typescript
formatDate('2026-03-22T10:30:00Z')    // → "2026-03-22"
formatDateTime('2026-03-22T10:30:00Z') // → "2026-03-22 10:30"
timeAgo('2026-03-22T10:00:00Z')        // → "30분 전"
```

---

## 9. 인프라

### 9.1 Docker Compose 아키텍처

#### 프로덕션 빌드 (`docker-compose.yml`)

```
┌─────────────────────────────────────────┐
│  console-web (nginx:80 → :5173)         │
│  tenant-web  (nginx:80 → :5174)         │
├─────────────────────────────────────────┤
│  console-api (:3000)  tenant-api (:3001)│
├─────────────────────────────────────────┤
│  postgres (pgvector/pgvector:pg16)      │
│  flyway-console  flyway-tenant          │
└─────────────────────────────────────────┘
```

서비스 구성 (6개):

| 서비스 | 이미지 | 역할 | 포트(호스트) |
| --- | --- | --- | --- |
| postgres | pgvector/pgvector:pg16 | DB (pgvector 확장 포함) | 미노출 |
| flyway-console | flyway/flyway:10 | Console DB 마이그레이션 | - |
| flyway-tenant | flyway/flyway:10 | Tenant DB 마이그레이션 | - |
| console-api | 빌드(Dockerfile) | Console REST API | 미노출 |
| tenant-api | 빌드(Dockerfile) | Tenant REST API | 미노출 |
| console-web | nginx + 빌드 결과 | 정적 파일 + API 프록시 | 5173 |
| tenant-web | nginx + 빌드 결과 | 정적 파일 + API 프록시 | 5174 |

init-db.sh에서 `haruos_console`, `haruos_tenant` 두 DB를 생성하고 pgvector 확장을 활성화한다.

#### 개발 모드 (`docker-compose.dev.yml`)

```
┌─ nginx-console (:5173) ─┐    ┌─ nginx-tenant (:5174) ─┐
│  /api/*  → console-api   │    │  /api/*  → tenant-api   │
│  /ws/*   → console-api   │    │  /ws/*   → tenant-api   │
│  /*      → console-web   │    │  /*      → tenant-web   │
│           (Vite HMR)     │    │           (Vite HMR)    │
└──────────────────────────┘    └─────────────────────────┘
                 ↓                          ↓
        console-api (:3000)         tenant-api (:3001)
                 ↓                          ↓
               postgres (pgvector:pg16)
```

차이점:
- API 서버: 빌드 대신 볼륨 마운트 + `pnpm dev` (hot reload)
- Web 서버: Vite dev server + HMR (nginx가 프록시)
- nginx가 `/api/*`, `/ws/*`, `/*`를 적절히 라우팅
- 호스트 노출 포트: nginx만 (5173, 5174)

#### Dockerfile (멀티 스테이지 빌드)

모든 Dockerfile은 동일한 패턴을 따른다.

```dockerfile
# Stage 1: 빌드
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
# 의존성 먼저 설치 (레이어 캐시 활용)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY packages/*/package.json ...
COPY apps/*/package.json ...
RUN pnpm install --frozen-lockfile
# 소스 복사 + 빌드
COPY packages/ ...
COPY apps/ ...
RUN pnpm --filter @haruos/{패키지} build

# Stage 2: 실행
FROM node:22-alpine  # (API) 또는 nginx:alpine (Web)
```

API 서버는 `pnpm deploy --legacy`로 독립 실행 가능한 디렉터리를 생성한다. Web은 빌드 결과를 nginx에 복사한다.

#### nginx 리버스 프록시

프로덕션(`console.conf`, `tenant.conf`):

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;

    location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
    location /api/ {
        proxy_pass http://console-api:3000;
        proxy_buffering off;  # SSE 지원
        proxy_cache off;
    }
    location / { try_files $uri $uri/ /index.html; }  # SPA fallback

    gzip on;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

개발(`console-dev.conf`, `tenant-dev.conf`):

```nginx
server {
    listen 80;
    location /api/ { proxy_pass http://console-api:3000; proxy_buffering off; }
    location /ws/  { proxy_pass http://console-api:3000; proxy_set_header Upgrade ...; }
    location /     { proxy_pass http://console-web-dev:5173; proxy_set_header Upgrade ...; }
}
```

### 9.2 Terraform

#### 디렉터리 구조

```
infra/terraform/
├── main.tf              # provider, backend (S3 + DynamoDB lock)
├── variables.tf         # 변수 정의
├── vpc.tf               # VPC, 서브넷, IGW, NAT, 라우팅
├── security-groups.tf   # ALB, ECS, RDS 보안 그룹
├── ecs.tf               # ECS Cluster, ALB, 서비스, 태스크, SSM
├── rds.tf               # Console DB (Aurora Serverless v2)
├── s3.tf                # 파일 저장소 S3 버킷
├── ecr.tf               # ECR 리포지토리 (4개 앱)
├── iam.tf               # ECS 실행/태스크 역할 + 정책
├── outputs.tf           # 출력값
└── modules/tenant/      # 테넌트별 독립 인프라 모듈
    ├── main.tf
    ├── variables.tf
    └── outputs.tf
```

#### 핵심 리소스 구성

**VPC** (`vpc.tf`)

```
VPC (10.0.0.0/16)
├── Public Subnets (10.0.1.0/24, 10.0.2.0/24) — AZ 2개
│   ├── Internet Gateway
│   └── ALB
├── Private Subnets (10.0.11.0/24, 10.0.12.0/24) — AZ 2개
│   ├── NAT Gateway (단일 — 비용 절감)
│   ├── ECS Fargate Tasks
│   └── RDS Aurora
```

**ECS** (`ecs.tf`)

| 리소스 | 설정 |
| --- | --- |
| ECS Cluster | Container Insights 활성화 |
| ALB | 퍼블릭 서브넷, HTTP/HTTPS |
| Console API Task | Fargate, 256 CPU / 512 MiB, awslogs |
| Console Web Task | Fargate, 256 CPU / 512 MiB |
| SSM Parameters | DB 자격증명 + JWT Secret (SecureString) |

비밀 값(DB 비밀번호, JWT Secret)은 SSM Parameter Store에 SecureString으로 저장하고 ECS Task에서 `secrets`로 참조한다.

**RDS** (`rds.tf`)

Console DB: Aurora PostgreSQL 16.4 Serverless v2 (min 0.5 ACU, max 2.0 ACU). 프로덕션에서 deletion_protection 활성화.

**S3** (`s3.tf`)

파일 저장소: 버전관리 활성화, AES256 암호화, 퍼블릭 접근 차단, 90일 후 STANDARD_IA 전환.

**ECR** (`ecr.tf`)

4개 앱(console-api, console-web, tenant-api, tenant-web)의 컨테이너 리포지토리. IMMUTABLE 태그, push 시 스캔, 최근 10개 이미지만 유지.

**IAM** (`iam.tf`)

| 역할 | 용도 | 정책 |
| --- | --- | --- |
| ECS Execution Role | ECR pull, 로깅 | AmazonECSTaskExecutionRolePolicy + SSM 읽기 |
| ECS Task Role | 앱 런타임 | S3, Bedrock, STS AssumeRole, CloudWatch |

STS AssumeRole 정책으로 `arn:aws:iam::*:role/HaruOS-TrustRole-*` 패턴의 역할만 assume 가능하다.

#### 테넌트 모듈 (`modules/tenant/`)

테넌트별 독립 인프라를 프로비저닝한다. 프로비저닝 서비스에서 Terraform을 실행하여 호출한다.

| 리소스 | 설명 |
| --- | --- |
| RDS Cluster | Aurora Serverless v2 (테넌트 전용) |
| Security Groups | `enable_sg_isolation`에 따라 전용/공유 선택 |
| S3 Bucket Policy | `tenants/{tenantId}/*` prefix 격리 |
| ALB Target Group | 테넌트 도메인 기반 라우팅 |
| ECS Task Definition | 테넌트별 환경변수 (DB_HOST, TENANT_ID) |
| ECS Service | Fargate, desired_count=1 |
| SSM Parameter | 테넌트 DB 비밀번호 |

보안 그룹 격리 옵션(`enable_sg_isolation=true`):
- 테넌트 전용 ECS SG: ALB에서만 인바운드
- 테넌트 전용 RDS SG: 해당 테넌트 ECS에서만 인바운드

### 9.3 CloudFormation (Trust Role)

사용자가 자기 AWS 계정에 배포하는 Cross-Account Trust Role 템플릿.

```yaml
# infra/cloudformation/trust-role.yaml
Parameters:
  HaruOSAccountId:  # HaruOS 플랫폼 AWS 계정 ID
  ExternalId:       # CSRF 방지용 External ID (테넌트 생성 시 발급)
  RoleName:         # HaruOS-TrustRole (prefix 강제)

Resources:
  HaruOSTrustRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Condition:
          StringEquals:
            'sts:ExternalId': !Ref ExternalId  # External ID 검증
      Policies:
        # ECS 관리 (Describe, Update)
        # CloudWatch 모니터링 (GetMetricData, DescribeAlarms)
        # Cost Explorer (GetCostAndUsage, GetCostForecast)
        # RDS 읽기 (DescribeDBClusters)
        # S3 (테넌트 버킷만)
```

연동 흐름:
1. console-web에서 CloudFormation Quick Create URL 생성 (`GET /aws/cfn-launch-url`)
2. 사용자가 자기 AWS 콘솔에서 1클릭 배포
3. 생성된 Role ARN을 console-api에 등록 (`POST /aws/credentials`)
4. console-api가 STS AssumeRole로 검증 (`POST /aws/credentials/validate`)

### 9.4 Ansible

테넌트 생명주기 관리 플레이북.

```
infra/cloudformation/ansible/
├── ansible.cfg
├── inventory/dynamic.yml
└── playbooks/
    ├── setup-tenant.yml    # 초기 설정
    └── update-tenant.yml   # 업데이트
```

#### setup-tenant.yml (초기 설정)

실행 순서:
1. Terraform init + apply (테넌트 인프라 생성)
2. RDS 엔드포인트 조회 + 준비 대기
3. Flyway 마이그레이션 (Docker 컨테이너로 실행)
4. ECS 서비스 시작 (desired_count=1) + 안정화 대기

#### update-tenant.yml (업데이트)

실행 순서:
1. (선택) Flyway 마이그레이션 (`RUN_MIGRATION=true` 시)
2. ECS 서비스 강제 재배포 (`--force-new-deployment`)
3. 안정화 대기

### 9.5 Flyway (DB 마이그레이션)

```
infra/flyway/
├── console/
│   ├── V1__init_schema.sql        # Console DB 전체 스키마
│   ├── V2__seed_common_codes.sql  # 공통코드 시드 데이터
│   └── V3__add_user_role.sql      # users.role 컬럼 추가
└── tenant/
    └── V1__init_schema.sql        # Tenant DB 전체 스키마
```

Console DB 마이그레이션 (V1): 공통코드, 인증, 테넌트, AWS 연동, 프로비저닝, 도메인, 모니터링, 과금, 인프라 정보 테이블.

Console DB 시드 (V2): 10개 코드 그룹의 공통코드 초기 데이터.

| 코드 그룹 | 코드 예시 |
| --- | --- |
| TENANT_STATUS | CREATING, ACTIVE, SUSPENDED, DELETED |
| PLAN_TYPE | STARTER, STANDARD, PRO |
| PROVISIONING_STATUS | PENDING, IN_PROGRESS, COMPLETED, FAILED, ROLLING_BACK |
| DOMAIN_TYPE | SUBDOMAIN, CUSTOM |
| DOMAIN_STATUS | PENDING, VERIFYING, ACTIVE, FAILED |
| AWS_CREDENTIAL_STATUS | PENDING, VALID, INVALID |
| SUBSCRIPTION_STATUS | TRIAL, ACTIVE, CANCELLED, EXPIRED |
| METRIC_TYPE | ECS_CPU, ECS_MEMORY, RDS_CPU, RDS_STORAGE, S3_SIZE |
| ALERT_TYPE | COST, CPU, DB_STORAGE, AI_TOKEN |
| DNS_PROVIDER / SSL_STATUS | CLOUDFLARE, ROUTE53, MANUAL / PENDING, ACTIVE, FAILED |

Tenant DB (V1): 공통코드, 인증(OTP), 대화, 프로젝트, 일정, 문서(pgvector 임베딩), 파일, AI, 배치, ClickUp 연동, 프로젝트 동기화, DOCX 템플릿 테이블.

---

## 10. 보안

### 10.1 인증/인가

#### Console API (이메일 + 비밀번호)

```
회원가입 → 이메일 인증 → 로그인 → JWT 발급
                                     ├── accessToken (15분)
                                     └── refreshToken (7일)
```

- `JwtAuthGuard`: 글로벌 가드. `@Public()` 데코레이터가 있으면 인증 건너뜀.
- `AdminGuard`: JWT 페이로드의 `role === 'ADMIN'`만 허용.
- Refresh Token: DB에 해시 저장, 갱신 시 이전 토큰 폐기.

```typescript
// apps/console-api/src/common/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [...]);
    if (isPublic) return true;

    const token = request.headers.authorization?.split(' ')[1];
    request.user = this.jwtService.verify(token);
    return true;
  }
}
```

```typescript
// apps/console-api/src/common/guards/admin.guard.ts
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!user || user.role !== 'ADMIN') throw new UnauthorizedException('Admin access required');
    return true;
  }
}
```

#### Tenant API (OTP)

```
OTP 발송 (이메일) → OTP 검증 → JWT 발급
```

비밀번호 없이 6자리 OTP 코드로 인증한다.

#### WebSocket 인증

연결 시 JWT 토큰 검증 (섹션 6.2 참고). 토큰이 없거나 유효하지 않으면 즉시 `client.disconnect()`.

### 10.2 테넌트 격리

| 계층 | 격리 방식 |
| --- | --- |
| DB | 테넌트별 독립 RDS 인스턴스 (Aurora Serverless v2) |
| S3 | `tenants/{tenantId}/*` prefix + Bucket Policy로 격리 |
| 네트워크 | 테넌트별 전용 Security Group (ECS SG ↔ RDS SG) |
| ECS | 테넌트별 Task Definition + Service (환경변수로 TENANT_ID 주입) |
| AWS 접근 | STS AssumeRole + External ID (Cross-Account) |

### 10.3 비밀 관리

| 항목 | 개발 환경 | 프로덕션 |
| --- | --- | --- |
| DB 비밀번호 | docker-compose 환경변수 | SSM Parameter Store (SecureString) |
| JWT Secret | docker-compose 환경변수 | SSM Parameter Store (SecureString) |
| AWS 키 | 저장하지 않음 (STS AssumeRole only) | 동일 |
| Stripe API Key | .env | SSM Parameter Store |

원칙:
- AWS 키를 코드나 DB에 저장하지 않는다. STS AssumeRole만 사용.
- SSM Parameter Store의 SecureString으로 암호화 저장.
- ECS Task Definition에서 `secrets`로 SSM 참조 (런타임에 주입).

---

## 11. 공통 패턴

### 11.1 예외 처리 계층

```
CustomException (최상위, errorCode 포함)
├── BusinessException (4xx) — 사용자가 해결 가능
│   ├── ResourceNotFoundException (404)
│   ├── DuplicateResourceException (409)
│   ├── ValidationException (400)
│   ├── UnauthorizedException (401)
│   └── InvalidStateTransitionException (409)
└── TechnicalException (5xx) — 시스템 문제, 로깅 후 일반 메시지 반환
    ├── ExternalApiException (502)
    ├── DatabaseException (500)
    └── InfrastructureException (500)
```

```typescript
// apps/console-api/src/common/exceptions/custom.exception.ts
export abstract class CustomException extends HttpException {
  readonly errorCode: string;
  constructor(errorCode: string, statusCode: number, message: string) {
    super(message, statusCode);
    this.errorCode = errorCode;
  }
}
```

`GlobalExceptionFilter`가 모든 예외를 `ApiResponse` 형식으로 변환한다.

```typescript
// apps/console-api/src/common/filters/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    // CustomException → errorCode + message
    // TechnicalException → 로그 남기고 "Internal server error" 반환
    // HttpException → HTTP_ERROR + message
    // 나머지 → UNKNOWN_ERROR + "Internal server error"
    const body: ApiResponse<null> = {
      success: false, code: errorCode, message, data: null,
      timestamp: new Date().toISOString(),
    };
    response.status(statusCode).json(body);
  }
}
```

핵심 원칙:
- Controller/Service에 try-catch를 작성하지 않는다
- TechnicalException은 에러 로그를 남기고 사용자에게는 일반 메시지만 반환
- 모든 예외에 에러 코드가 포함되어 프론트엔드 연동 및 로그 검색에 사용

### 11.2 ApiResponse 통일

`ApiResponseInterceptor`가 Controller 반환값을 자동으로 래핑한다.

```typescript
// apps/console-api/src/common/interceptors/api-response.interceptor.ts
@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        code: 'OK',
        message: 'Success',
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

성공 응답 예:

```json
{
  "success": true,
  "code": "OK",
  "message": "Success",
  "data": { "id": "...", "name": "..." },
  "timestamp": "2026-03-22T10:30:00.000Z"
}
```

에러 응답 예:

```json
{
  "success": false,
  "code": "RESOURCE_NOT_FOUND",
  "message": "Tenant not found: abc-123",
  "data": null,
  "timestamp": "2026-03-22T10:30:00.000Z"
}
```

프론트엔드의 `createApiClient`가 성공 응답에서 `data`를 자동 추출하므로, 호출측에서는 래퍼를 의식하지 않아도 된다.

### 11.3 DTO/VO 패턴

Entity를 API에 직접 노출하지 않는다. 반드시 DTO로 변환.

| 구분 | 역할 | 네이밍 | 위치 |
| --- | --- | --- | --- |
| Request DTO | 입력 검증 (class-validator) | `*RequestDto` | `dto/` |
| Response DTO | 출력 변환 (팩토리 메서드 `from()`) | `*ResponseDto` | `dto/` |
| VO | 재사용 불변 값 객체 | `*Vo` | `vo/` 또는 `common/vo/` |

팩토리 메서드 규칙:

| 메서드 | 의미 | 예시 |
| --- | --- | --- |
| `of()` | 파라미터를 그대로 사용 | `Money.of(1000, 'KRW')` |
| `from()` | 다른 타입에서 변환 | `ConversationResponseDto.from(entity)` |
| `create()` | 복잡한 생성 로직 포함 | `Tenant.create(name, plan)` |

### 11.4 엔티티 상태 전이

상태를 가진 엔티티는 setter를 사용하지 않고, 비즈니스 메서드로 상태를 전이한다.

```
Tenant: CREATING → ACTIVE → SUSPENDED → DELETED
                            ↑           ↑
                            └───────────┘ (재활성화)

Provisioning: PENDING → IN_PROGRESS → COMPLETED
                                     → FAILED → ROLLING_BACK
```

허용되지 않은 전이 시 `InvalidStateTransitionException`을 발생시킨다.

```typescript
export class InvalidStateTransitionException extends BusinessException {
  constructor(currentState: string, targetState: string) {
    super('INVALID_STATE_TRANSITION', HttpStatus.CONFLICT,
      `Cannot transition from ${currentState} to ${targetState}`);
  }
}
```

### 11.5 Base Entity

```typescript
// apps/console-api/src/common/entities/base.entity.ts
export abstract class BaseEntity {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export abstract class SoftDeletableEntity extends BaseEntity {
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
```

- ID는 상속하지 않는다 (엔티티마다 전략이 다름 — UUID 권장)
- Soft delete 필요 시 `SoftDeletableEntity` 상속

### 11.6 캐시 전략

| 데이터 | TTL | 이유 |
| --- | --- | --- |
| 공통코드 | 30분~1시간 | 변경 드묾 |
| 사용자 세션 | 30분 | 보안 |
| 집계 데이터 | 5분 | 실시간성 |
| 목록 조회 | 1~5분 | 변경 빈도 |

CUD 발생 시 관련 캐시를 명시적으로 삭제한다.

프론트엔드에서는 TanStack Query의 `staleTime: 60_000`(1분)과 `invalidateQueries`로 서버 상태와 동기화한다.

### 11.7 공통코드 시스템

Enum이 아닌 DB 기반 공통코드로 코드성 데이터를 관리한다. 런타임에 코드 추가/수정이 가능하여 재배포 없이 변경 가능.

```sql
-- code_groups: 코드 그룹 정의
-- codes: 코드 값 정의 (group_code FK, code, name, sort_order, is_enabled, metadata JSONB)
```

규칙:
- 코드값(string)으로 직접 저장. FK를 잡지 않는다 (코드 비활성화 시 참조 무결성 문제 방지)
- 정합성은 애플리케이션 레벨에서 검증
- 캐시 필수: TTL 30분~1시간, 코드 변경 시 캐시 무효화

등록된 코드 그룹 (10개): TENANT_STATUS, PLAN_TYPE, AWS_CREDENTIAL_STATUS, PROVISIONING_STATUS, DOMAIN_TYPE, DOMAIN_STATUS, DNS_PROVIDER, SSL_STATUS, SUBSCRIPTION_STATUS, METRIC_TYPE, ALERT_TYPE

---

## 12. CI/CD

### 12.1 CI 파이프라인 (`.github/workflows/ci.yml`)

트리거: `push` 또는 `pull_request` → main, develop 브랜치.

```yaml
# .github/workflows/ci.yml
steps:
  - pnpm install --frozen-lockfile
  - pnpm --filter './packages/**' build   # 공유 패키지 먼저 빌드
  - pnpm lint                              # ESLint
  - pnpm build                             # 전체 앱 빌드
  - pnpm test                              # 단위 테스트 + E2E
```

실행 환경: ubuntu-latest, Node.js 22, pnpm 10.

### 12.2 CD 파이프라인 (`.github/workflows/cd.yml`)

트리거: main 브랜치 push.

```
1. AWS 인증 (OIDC — role-to-assume)
2. ECR 로그인
3. 이미지 태그 = 커밋 SHA 앞 8자
4. Docker Build & Push (4개 앱)
   - console-api, console-web, tenant-api, tenant-web
5. ECS 서비스 강제 재배포 (rolling update)
6. aws ecs wait services-stable (안정화 대기)
```

핵심 설정:
- `permissions: id-token: write` — GitHub OIDC로 AWS 자격증명 획득 (시크릿 키 없음)
- `docker/build-push-action@v6` — 멀티 스테이지 빌드 + ECR push
- `aws ecs update-service --force-new-deployment` — 새 이미지로 롤링 업데이트

### 12.3 배포 아키텍처

```
GitHub (main push)
    │
    ▼
CI 파이프라인 (lint + build + test)
    │ 성공 시
    ▼
CD 파이프라인
    │
    ├── Docker Build (4개 이미지)
    │       console-api, console-web, tenant-api, tenant-web
    │
    ├── ECR Push (태그: 커밋 SHA[:8])
    │
    └── ECS 롤링 업데이트
            haruos-prod-cluster
            ├── haruos-prod-console-api
            └── haruos-prod-console-web
```

---

## 13. 테스트 전략

### 13.1 백엔드 테스트

**프레임워크**: Jest (NestJS 기본 설정)

**단위 테스트** (`*.spec.ts`):

서비스 레이어 중심. Repository/Port를 모킹하여 비즈니스 로직만 검증.

테스트 파일 위치 (각 서비스와 동일 디렉터리):
- `apps/console-api/src/modules/auth/auth.service.spec.ts`
- `apps/console-api/src/modules/tenant/tenant.service.spec.ts`
- `apps/console-api/src/modules/common-code/common-code.service.spec.ts`
- `apps/console-api/src/modules/monitoring/monitoring.service.spec.ts`
- `apps/console-api/src/modules/provisioner/provisioner.service.spec.ts`
- `apps/console-api/src/modules/domain/domain.service.spec.ts`
- `apps/console-api/src/modules/backup/backup.service.spec.ts`
- `apps/console-api/src/modules/aws/entities/aws-credential.entity.spec.ts`
- `apps/tenant-api/src/core/ai-gateway/ai-gateway.service.spec.ts`
- `apps/tenant-api/src/core/storage/storage.service.spec.ts`
- `apps/tenant-api/src/core/doc-engine/doc-engine.service.spec.ts`
- `apps/tenant-api/src/haru/orchestrator/orchestrator.service.spec.ts`
- `apps/tenant-api/src/haru/orchestrator/intent-parser.service.spec.ts`
- `apps/tenant-api/src/haru/orchestrator/agent-router.service.spec.ts`
- `apps/tenant-api/src/haru/context/context-manager.service.spec.ts`
- `apps/tenant-api/src/haru/batch/batch-scheduler.service.spec.ts`
- `apps/tenant-api/src/agents/project/project-agent.service.spec.ts`
- `apps/tenant-api/src/agents/schedule/schedule-agent.service.spec.ts`
- `apps/tenant-api/src/agents/file/file-agent.service.spec.ts`

**E2E 테스트** (`infra/docker/test/`):

통합 테스트 환경 전용 디렉터리. 실제 PostgreSQL(Docker) + supertest로 API 엔드포인트 검증.

- `auth.e2e-spec.ts`: 회원가입 → 로그인 → 토큰 갱신 → OTP 흐름
- `haru.e2e-spec.ts`: 대화 생성 → 메시지 전송 → 응답 검증
- `document.e2e-spec.ts`: 문서 CRUD → AI 요약
- `schedule.e2e-spec.ts`: 일정 CRUD → 상태 전이
- `file.e2e-spec.ts`: 파일 업로드 → 다운로드 → 삭제
- `test-db.config.ts`: 테스트용 DB 연결 설정

### 13.2 엔티티 상태 전이 테스트

상태를 가진 엔티티(Tenant, Subscription, ProvisioningJob, Backup 등)는 허용되지 않은 전이 시 `InvalidStateTransitionException`을 발생시키는 것을 테스트한다.

```typescript
// apps/console-api/src/modules/aws/entities/aws-credential.entity.spec.ts
it('VALIDATED 상태가 아닌 엔티티에서 invalidate()를 호출하면 예외 발생', () => {
  const entity = new AwsCredentialEntity();
  entity.status = 'PENDING';
  expect(() => entity.invalidate()).toThrow(InvalidStateTransitionException);
});
```

### 13.3 테스트 원칙

- 모든 서비스는 대응하는 `*.spec.ts` 파일을 가진다
- Repository, Port는 `jest.fn()`으로 모킹하여 외부 의존 없이 단위 테스트 가능
- 상태 전이 엔티티는 허용/비허용 전이를 모두 테스트
- E2E 테스트는 실제 DB를 사용하여 API 전체 흐름 검증
- CI에서 `pnpm test`로 전체 테스트 실행
