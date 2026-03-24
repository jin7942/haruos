# HaruOS 개발 가이드: NestJS + RAG 입문

| 버전 | 변경내용 | 작성자 | 수정일 |
| --- | --- | --- | --- |
| v1.0 | 초기 작성 | 김진범 | 2026-03-24 |

---

## Part 1: NestJS 기초

### 1.1 NestJS란?

NestJS는 Express(또는 Fastify) 위에서 동작하는 Node.js 백엔드 프레임워크다. Angular에서 영감을 받아 **데코레이터**와 **의존성 주입(DI)**을 핵심으로 사용한다.

왜 NestJS인가?
- Express만으로는 프로젝트가 커질수록 구조가 무너진다
- NestJS는 Module/Controller/Service 구조를 강제하여 일관성을 유지한다
- TypeScript 네이티브 지원
- DI 컨테이너가 내장되어 테스트와 모듈 교체가 쉽다

### 1.2 핵심 구성 요소

NestJS를 레스토랑에 비유하면:

| 구성 요소 | 레스토랑 비유 | 역할 |
| --- | --- | --- |
| **Module** | 레스토랑 자체 | 관련 기능을 하나로 묶는 단위 |
| **Controller** | 웨이터 | HTTP 요청을 받고 응답을 반환 |
| **Service** | 셰프 | 비즈니스 로직을 처리 |
| **Repository** | 냉장고 | 데이터를 저장하고 꺼내옴 |

```
[클라이언트] → [Controller(웨이터)] → [Service(셰프)] → [Repository(냉장고)] → [DB]
```

- 웨이터(Controller)는 요리법을 모른다. 주문만 받아 셰프에게 전달한다.
- 셰프(Service)는 손님과 직접 대화하지 않는다. 요리만 한다.
- 냉장고(Repository)는 재료를 보관할 뿐, 요리하지 않는다.

각자의 역할만 수행하는 것이 핵심이다.

### 1.3 HaruOS 프로젝트 구조

모든 NestJS 앱은 `main.ts`에서 시작한다.

**파일: `apps/console-api/src/main.ts`**
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';

async function bootstrap() {
  // 1. 앱 생성 (AppModule이 루트 모듈)
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // 2. 모든 API 경로에 '/api' 접두사
  app.setGlobalPrefix('api');

  // 3. CORS 설정 (프론트엔드에서 호출 가능하도록)
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // 4. 전역 필터/인터셉터/파이프 등록
  app.useGlobalFilters(new GlobalExceptionFilter());       // 에러 → 통일 응답
  app.useGlobalInterceptors(new ApiResponseInterceptor()); // 성공 → 통일 응답
  app.useGlobalPipes(new ValidationPipe({                  // DTO 자동 검증
    whitelist: true,           // DTO에 없는 필드 제거
    forbidNonWhitelisted: true, // DTO에 없는 필드 전송 시 에러
    transform: true,           // 문자열 → 숫자 등 자동 변환
  }));

  // 5. Swagger 설정 (/api/docs에서 확인)
  // ... (생략)

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

`main.ts` → `AppModule` → 각 모듈로 이어지는 구조다.

**파일: `apps/console-api/src/app.module.ts`**
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ... }),  // 환경변수
    TypeOrmModule.forRootAsync({ ... }),             // DB 연결
    JwtModule.registerAsync({ ... }),                // JWT 설정
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]), // Rate limiting
    AuthModule,          // 인증
    CommonCodeModule,    // 공통코드
    TenantModule,        // 테넌트 관리
    // ... 기능별 모듈들
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },    // 전역 인증 가드
    { provide: APP_GUARD, useClass: ThrottlerGuard },   // 전역 Rate limit
  ],
})
export class AppModule {}
```

### 1.4 의존성 주입 (DI)

**DI란?** 레고 블록을 조립하는 것과 같다.

레고로 집을 만들 때, 지붕 블록을 직접 깎아 만들지 않는다. 필요한 블록을 **외부에서 받아** 조립한다. DI도 마찬가지다. Service가 필요한 것(Repository, 다른 Service)을 **직접 생성하지 않고**, NestJS가 **자동으로 넣어준다**.

```typescript
// BAD: 직접 생성 (DI 없이)
class AuthService {
  private userRepo = new UserRepository(); // 직접 생성 → 교체 불가
}

// GOOD: DI로 주입받음
@Injectable()
class AuthService {
  constructor(
    private readonly userRepo: Repository<UserEntity>, // NestJS가 넣어줌
  ) {}
}
```

**왜 DI를 쓰는가?**
- **테스트**: 실제 DB 대신 가짜(mock) Repository를 넣을 수 있다
- **교체**: 메일 발송을 SES에서 SendGrid로 바꿀 때, Service 코드 변경 없이 Module 설정만 변경

**HaruOS 실제 예시: AI 모델 교체가 자유로운 이유**

```typescript
// 파일: apps/tenant-api/src/core/ai-gateway/ai-gateway.module.ts
@Module({
  providers: [
    AiGatewayService,
    { provide: AiModelPort, useClass: BedrockAdapter }, // ← 여기만 바꾸면 됨
  ],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
```

`AiModelPort`(콘센트)에 `BedrockAdapter`(플러그)를 꽂는 구조다. 나중에 OpenAI로 바꾸고 싶으면 `useClass: OpenAiAdapter`로 변경하면 끝이다. `AiGatewayService`는 변경할 필요가 없다.

### 1.5 데코레이터 완전 가이드

데코레이터는 클래스나 메서드에 **메타데이터를 붙이는 문법**이다. `@`로 시작한다.

#### 라우팅 데코레이터

```typescript
// 파일: apps/console-api/src/modules/auth/auth.controller.ts
@Controller('auth')  // 이 컨트롤러의 기본 경로: /api/auth
export class AuthController {

  @Post('signup')    // POST /api/auth/signup
  signup(@Body() dto: SignupRequestDto) { ... }

  @Post('login')     // POST /api/auth/login
  login(@Body() dto: LoginRequestDto) { ... }
}
```

| 데코레이터 | HTTP 메서드 | 용도 |
| --- | --- | --- |
| `@Get()` | GET | 조회 |
| `@Post()` | POST | 생성 |
| `@Patch()` | PATCH | 수정 |
| `@Delete()` | DELETE | 삭제 |

#### 파라미터 데코레이터

```typescript
@Post('signup')
signup(
  @Body() dto: SignupRequestDto,        // 요청 본문 (JSON)
  @Param('id') id: string,             // URL 경로 파라미터 (/users/:id)
  @Query('page') page: string,          // 쿼리 스트링 (?page=1)
  @Req() req: Request,                  // Express Request 객체 전체
) { ... }
```

#### Swagger 데코레이터 (API 문서화)

```typescript
@ApiTags('Auth')                        // Swagger 그룹명
@Controller('auth')
export class AuthController {

  @Post('signup')
  @ApiOperation({ summary: '회원가입' })    // API 설명
  @ApiResponse({ status: 201, type: SignupResponseDto }) // 응답 형식
  signup(@Body() dto: SignupRequestDto) { ... }

  @Post('change-password')
  @ApiBearerAuth()                        // JWT 토큰 필요 표시
  changePassword(@Req() req: Request, @Body() dto: ChangePasswordRequestDto) { ... }
}
```

#### 인증/권한 데코레이터

```typescript
@Public()           // 인증 불필요 (JwtAuthGuard 스킵)
@Post('login')
login() { ... }

@UseGuards(AdminGuard) // 관리자만 접근 가능
@Get('admin/users')
listUsers() { ... }
```

### 1.6 TypeORM 엔티티

엔티티는 DB 테이블과 1:1로 매핑되는 TypeScript 클래스다.

**파일: `apps/console-api/src/common/entities/base.entity.ts`**
```typescript
// 모든 엔티티가 상속하는 공통 필드
export abstract class BaseEntity {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// Soft delete가 필요한 엔티티용
export abstract class SoftDeletableEntity extends BaseEntity {
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
```

**파일: `apps/console-api/src/modules/auth/entities/user.entity.ts`**
```typescript
@Entity('users')                      // DB 테이블명: users
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')     // UUID 자동 생성
  id: string;

  @Column({ name: 'email', unique: true })  // 유니크 제약
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'role', type: 'varchar', length: 20, default: 'USER' })
  role: UserRole;                     // 'USER' | 'ADMIN'

  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;
}
```

**타입 매핑 참고:**

| TypeORM 타입 | PostgreSQL 타입 | TypeScript 타입 |
| --- | --- | --- |
| `varchar` | varchar | string |
| `text` | text | string |
| `int` | integer | number |
| `boolean` | boolean | boolean |
| `timestamptz` | timestamptz | Date |
| `jsonb` | jsonb | object |
| `float8`, `array: true` | float8[] | number[] |

**상태 전이 규칙:** HaruOS에서는 상태를 가진 엔티티에 setter를 쓰지 않는다. 비즈니스 메서드로 상태를 변경한다.

```typescript
// BAD
tenant.status = 'SUSPENDED';

// GOOD
tenant.suspend(); // 내부에서 현재 상태 검증 후 전이
```

### 1.7 DTO와 Validation

**DTO(Data Transfer Object)**는 계층 간 데이터를 주고받는 그릇이다. Entity를 직접 API에 노출하지 않는다.

**Request DTO - 입력 검증:**

```typescript
// 파일: apps/console-api/src/modules/auth/dto/signup.request.dto.ts
export class SignupRequestDto {
  @ApiProperty({ description: '이메일 주소' })
  @IsEmail()                   // 이메일 형식 검증
  email: string;

  @ApiProperty({ description: '비밀번호 (8자 이상)' })
  @IsString()
  @MinLength(8)                // 최소 8자
  password: string;

  @ApiProperty({ description: '사용자 이름' })
  @IsString()
  @MinLength(2)
  name: string;
}
```

이 DTO로 요청하면 `ValidationPipe`가 자동으로 검증한다. 유효하지 않으면 400 에러가 반환된다.

**자주 쓰는 class-validator 데코레이터:**

| 데코레이터 | 의미 |
| --- | --- |
| `@IsString()` | 문자열인지 |
| `@IsEmail()` | 이메일 형식인지 |
| `@IsNotEmpty()` | 빈 값이 아닌지 |
| `@MinLength(n)` | 최소 n글자 |
| `@IsOptional()` | 선택 필드 (없어도 됨) |
| `@IsUUID()` | UUID 형식인지 |
| `@IsNumber()` | 숫자인지 |
| `@Min(n)` / `@Max(n)` | 최소/최대값 |

**Response DTO - Entity를 DTO로 변환 (static from 팩토리):**

```typescript
// 파일: apps/console-api/src/modules/auth/dto/auth.response.dto.ts

/** 사용자 요약 정보 VO. 여러 응답 DTO에서 재사용. */
export class UserSummaryVo {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() name: string;
  @ApiProperty() role: string;

  /** Entity → VO 변환. passwordHash 같은 민감 정보는 제외된다. */
  static from(user: UserEntity): UserSummaryVo {
    const vo = new UserSummaryVo();
    vo.id = user.id;
    vo.email = user.email;
    vo.name = user.name;
    vo.role = user.role;
    return vo;
  }
}

/** 회원가입 응답. */
export class SignupResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() name: string;
  @ApiProperty() createdAt: Date;

  static from(user: UserEntity): SignupResponseDto {
    const dto = new SignupResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
```

**팩토리 메서드 규칙:**

| 메서드 | 의미 | 예시 |
| --- | --- | --- |
| `of()` | 파라미터를 그대로 사용 | `Money.of(1000, 'KRW')` |
| `from()` | 다른 타입에서 변환 | `SignupResponseDto.from(user)` |
| `create()` | 복잡한 생성 로직 포함 | `Tenant.create(name, plan)` |

### 1.8 예외 처리 패턴

HaruOS는 예외를 **비즈니스(4xx)**와 **기술(5xx)**로 나누고, `GlobalExceptionFilter`에서 일괄 처리한다.

**예외 계층 구조:**
```
CustomException (최상위, errorCode 포함)
├── BusinessException (4xx) — 사용자가 해결 가능
│   ├── ResourceNotFoundException (404)    "User not found: abc-123"
│   ├── DuplicateResourceException (409)   "User already exists: test@test.com"
│   ├── ValidationException (400)          "Email already verified"
│   └── UnauthorizedException (401)        "Invalid email or password"
└── TechnicalException (5xx) — 시스템 문제
    ├── ExternalApiException (502)         "External API error [Bedrock]: timeout"
    ├── DatabaseException (500)
    └── InfrastructureException (500)
```

**사용 예시:**

```typescript
// 파일: apps/console-api/src/modules/auth/auth.service.ts
async signup(dto: SignupRequestDto): Promise<SignupResponseDto> {
  const existing = await this.userRepository.findOne({ where: { email: dto.email } });
  if (existing) {
    throw new DuplicateResourceException('User', dto.email); // ← 예외 던지면 끝
  }
  // ... 정상 로직
}
```

**Controller에 try-catch를 쓰지 않는 이유:**

`GlobalExceptionFilter`가 모든 예외를 잡아서 통일된 `ApiResponse` 형식으로 변환한다.

```typescript
// GlobalExceptionFilter가 하는 일:
// 1. CustomException이면 → errorCode와 메시지를 그대로 사용
// 2. TechnicalException이면 → 로그 남기고, 클라이언트에는 "Internal server error" 반환
// 3. 그 외 예외 → "UNKNOWN_ERROR"로 처리

// 응답 형식 (항상 동일):
{
  "success": false,
  "code": "DUPLICATE_RESOURCE",
  "message": "User already exists: test@test.com",
  "data": null,
  "timestamp": "2026-03-24T10:00:00.000Z"
}
```

### 1.9 Guard, Interceptor, Pipe

요청이 Controller에 도달하기까지 여러 단계를 거친다. 공항에 비유하면:

```
[요청] → Guard(보안검색) → Interceptor(짐 포장-전) → Pipe(여권 확인) → Controller(탑승) → Interceptor(짐 포장-후) → [응답]
```

| 단계 | 비유 | HaruOS 사용 예시 | 파일 |
| --- | --- | --- | --- |
| **Guard** | 보안검색 | `JwtAuthGuard`: JWT 토큰 검증 | `common/guards/jwt-auth.guard.ts` |
| **Interceptor** | 짐 포장 | `ApiResponseInterceptor`: 응답을 `ApiResponse`로 래핑 | `common/interceptors/api-response.interceptor.ts` |
| **Pipe** | 여권 확인 | `ValidationPipe`: DTO 검증 (class-validator) | NestJS 내장 |
| **Filter** | 비상구 | `GlobalExceptionFilter`: 에러 시 통일 응답 | `common/filters/global-exception.filter.ts` |

**JwtAuthGuard 동작 원리:**

```typescript
// 파일: apps/console-api/src/common/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // 1. @Public() 데코레이터가 있으면 통과
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [...]);
    if (isPublic) return true;

    // 2. Authorization 헤더에서 Bearer 토큰 추출
    const token = authHeader.split(' ')[1];

    // 3. 토큰 검증 (실패 시 UnauthorizedException)
    request.user = this.jwtService.verify(token);
    return true;
  }
}
```

### 1.10 새 모듈 만들기 (step by step)

"notification" 모듈을 처음부터 만드는 과정이다.

**Step 1: 디렉토리 생성**
```
src/modules/notification/
├── dto/
│   ├── create-notification.request.dto.ts
│   └── notification.response.dto.ts
├── entities/
│   └── notification.entity.ts
├── notification.controller.ts
├── notification.service.ts
└── notification.module.ts
```

**Step 2: Entity 작성**
```typescript
// entities/notification.entity.ts
@Entity('notifications')
export class NotificationEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'title' })
  title: string;

  @Column({ name: 'content', type: 'text' })
  content: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;
}
```

**Step 3: DTO 작성**
```typescript
// dto/create-notification.request.dto.ts
export class CreateNotificationRequestDto {
  @ApiProperty() @IsString() @MinLength(1) title: string;
  @ApiProperty() @IsString() @MinLength(1) content: string;
}

// dto/notification.response.dto.ts
export class NotificationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() content: string;
  @ApiProperty() isRead: boolean;
  @ApiProperty() createdAt: Date;

  static from(entity: NotificationEntity): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.content = entity.content;
    dto.isRead = entity.isRead;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
```

**Step 4: Service 작성**
```typescript
// notification.service.ts
@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
  ) {}

  async create(userId: string, dto: CreateNotificationRequestDto): Promise<NotificationResponseDto> {
    const entity = this.notificationRepository.create({
      userId, title: dto.title, content: dto.content,
    });
    const saved = await this.notificationRepository.save(entity);
    return NotificationResponseDto.from(saved);
  }

  async findByUser(userId: string): Promise<NotificationResponseDto[]> {
    const entities = await this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return entities.map(NotificationResponseDto.from);
  }
}
```

**Step 5: Controller 작성**
```typescript
// notification.controller.ts
@ApiTags('Notification')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @ApiOperation({ summary: '알림 생성' })
  create(@Req() req: Request, @Body() dto: CreateNotificationRequestDto) {
    return this.notificationService.create((req as any).user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: '내 알림 목록' })
  findMine(@Req() req: Request) {
    return this.notificationService.findByUser((req as any).user.sub);
  }
}
```

**Step 6: Module 작성**
```typescript
// notification.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity])],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
```

**Step 7: AppModule에 등록**
```typescript
// app.module.ts
@Module({
  imports: [
    // ... 기존 모듈들
    NotificationModule, // ← 추가
  ],
})
export class AppModule {}
```

---

## Part 2: 포트/어댑터 패턴

### 2.1 왜 필요한지

외부 시스템(AWS, Stripe, 메일 서비스)을 직접 호출하면 두 가지 문제가 생긴다:

1. **테스트 어려움**: 테스트할 때마다 AWS에 실제 요청을 보낼 수 없다
2. **교체 어려움**: SES에서 SendGrid로 바꾸려면 Service 코드 전체를 수정해야 한다

**비유: 콘센트(Port)와 플러그(Adapter)**

벽에 있는 콘센트(Port)는 규격이 정해져 있다. 어떤 전자기기(Adapter)든 규격만 맞으면 꽂을 수 있다. 드라이기를 바꿔도 콘센트를 바꿀 필요 없다.

```
[Service] → [Port(콘센트/인터페이스)] ← [Adapter(플러그/구현체)]

Service는 Port만 안다. 어떤 Adapter가 꽂혀있는지 모른다.
```

### 2.2 포트 정의 (추상 클래스)

Port는 "이런 기능이 필요하다"는 계약서다. TypeScript의 `abstract class`로 정의한다.

**파일: `apps/console-api/src/modules/auth/ports/mail-sender.port.ts`**
```typescript
/**
 * 이메일 발송 포트.
 * 개발 환경에서는 ConsoleMailAdapter, 프로덕션에서는 SES 어댑터로 교체.
 */
export abstract class MailSenderPort {
  /** 이메일 인증 메일을 발송한다. */
  abstract sendVerificationEmail(email: string, token: string): Promise<void>;
}
```

**파일: `apps/tenant-api/src/core/ai-gateway/ports/ai-model.port.ts`**
```typescript
/**
 * AI 모델 호출 포트.
 * Bedrock, OpenAI 등 어떤 AI 서비스든 이 인터페이스만 구현하면 된다.
 */
export abstract class AiModelPort {
  abstract chat(messages: ChatMessageDto[], options?: AiOptionsDto): Promise<AiChatResponseDto>;
  abstract streamChat(messages: ChatMessageDto[], options?: AiOptionsDto): Observable<string>;
  abstract summarize(text: string): Promise<string>;
  abstract extractIntent(message: string): Promise<IntentResultDto>;
  abstract generateEmbedding(text: string): Promise<number[]>;
}
```

### 2.3 어댑터 구현

Adapter는 Port의 구체적인 구현이다. 실제 외부 시스템을 호출한다.

**파일: `apps/console-api/src/modules/auth/adapters/console-mail.adapter.ts`**
```typescript
/** 개발용 이메일 어댑터. 실제 메일 발송 대신 콘솔 로그로 출력. */
@Injectable()
export class ConsoleMailAdapter extends MailSenderPort {
  private readonly logger = new Logger(ConsoleMailAdapter.name);

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    this.logger.log(`[이메일 인증] to: ${email}, token: ${token}`);
  }
}
```

**파일: `apps/tenant-api/src/core/ai-gateway/adapters/bedrock.adapter.ts`**
```typescript
/** Bedrock AI 모델 어댑터 (stub). 프로덕션에서는 실제 AWS SDK 호출로 교체. */
@Injectable()
export class BedrockAdapter extends AiModelPort {
  async chat(messages: ChatMessageDto[], options?: AiOptionsDto): Promise<AiChatResponseDto> {
    // 프로덕션: AWS SDK로 Bedrock API 호출
    // 현재: stub 응답 반환
    return AiChatResponseDto.from('[Stub] AI 응답입니다.', 'anthropic.claude-3-sonnet', ...);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // 프로덕션: Bedrock Titan Embedding 호출
    // 현재: 빈 벡터 반환
    return new Array(1536).fill(0);
  }
  // ... 나머지 메서드도 동일 패턴
}
```

### 2.4 Module에서 DI 바인딩

Module에서 Port와 Adapter를 연결한다. 이 한 줄이 핵심이다.

```typescript
// 파일: apps/console-api/src/modules/auth/auth.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, ...])],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: MailSenderPort, useClass: ConsoleMailAdapter }, // ← 핵심!
    // 프로덕션에서는:
    // { provide: MailSenderPort, useClass: SesMailAdapter },
  ],
})
export class AuthModule {}
```

```typescript
// 파일: apps/tenant-api/src/core/ai-gateway/ai-gateway.module.ts
@Module({
  providers: [
    AiGatewayService,
    { provide: AiModelPort, useClass: BedrockAdapter }, // ← 핵심!
  ],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
```

`provide: Port, useClass: Adapter`의 의미: "누군가 `AiModelPort`를 달라고 하면, `BedrockAdapter` 인스턴스를 줘라."

Service는 Port만 의존하므로, Adapter가 바뀌어도 Service 코드는 변경하지 않는다.

### 2.5 테스트에서 Mock

테스트 시에는 실제 Adapter 대신 가짜(Mock)를 넣는다.

```typescript
// 파일: apps/console-api/src/modules/auth/auth.service.spec.ts
const module: TestingModule = await Test.createTestingModule({
  providers: [
    AuthService,
    {
      provide: MailSenderPort,
      useValue: {
        sendVerificationEmail: jest.fn().mockResolvedValue(undefined), // 가짜!
      },
    },
    // ... 다른 mock들
  ],
}).compile();
```

이렇게 하면 실제 이메일이 발송되지 않으면서도 `AuthService.signup()`의 로직을 완전히 테스트할 수 있다.

---

## Part 3: RAG 완전 가이드

### 3.1 RAG란?

LLM(대형 언어 모델)에는 한계가 있다:
- 학습 데이터 이후의 정보를 모른다
- 우리 회사 내부 문서를 모른다
- 없는 정보를 그럴듯하게 지어낸다 (할루시네이션)

**RAG = "LLM에게 오픈북 시험을 보게 하는 것"**

시험에서 교과서를 펼쳐놓고 답을 찾듯, LLM에게 관련 문서를 함께 제공하고 "이 자료를 바탕으로 답해"라고 한다.

- **R**etrieval (검색): 질문과 관련된 문서를 DB에서 찾아온다
- **A**ugmented (증강): 찾은 문서를 프롬프트에 붙인다
- **G**eneration (생성): LLM이 문서를 참고하여 답변을 생성한다

### 3.2 임베딩이란?

임베딩은 텍스트를 **숫자 벡터(배열)**로 변환하는 것이다.

**비유: 세계 지도에 도시를 배치하는 것**

지도에서 서울과 부산은 가깝고, 서울과 런던은 멀다. 임베딩도 마찬가지다. 의미가 비슷한 텍스트는 벡터 공간에서 가깝게 배치된다.

```
"고양이" → [0.2, 0.8, 0.1, ...] (1536개 숫자)
"강아지" → [0.3, 0.7, 0.2, ...] (비슷한 벡터 = 의미가 비슷)
"자동차" → [0.9, 0.1, 0.8, ...] (다른 벡터 = 의미가 다름)
```

**코사인 유사도**: 두 벡터의 각도가 작을수록 유사하다.
- "고양이"와 "강아지": 유사도 0.92 (거의 같은 방향)
- "고양이"와 "자동차": 유사도 0.15 (전혀 다른 방향)

HaruOS에서는 AWS Bedrock의 Titan 모델이 텍스트를 1536차원 벡터로 변환한다.

### 3.3 pgvector란?

**pgvector**는 PostgreSQL에 벡터 검색 기능을 추가하는 확장이다.

별도의 벡터 DB(Pinecone, Weaviate)를 쓸 필요 없이, 기존 PostgreSQL에서 바로 유사도 검색이 가능하다.

핵심 기능:
- `vector(1536)` 타입: 1536차원 벡터를 저장하는 컬럼 타입
- `<=>` 연산자: 두 벡터 사이의 L2 거리를 계산 (작을수록 유사)
- 인덱스: `IVFFlat`(빠른 근사 검색), `HNSW`(더 정확한 근사 검색)

```sql
-- 벡터 유사도 검색 쿼리
SELECT *, 1 - (embedding::vector <=> $1::vector) AS score
FROM document_chunks
WHERE embedding IS NOT NULL
ORDER BY embedding::vector <=> $1::vector
LIMIT 5;
```

HaruOS에서는 `float8[]` 배열로 저장하고, 검색 시 `::vector`로 캐스팅하여 pgvector 연산을 사용한다. pgvector가 없는 환경에서도 배열 자체는 저장/조회 가능하고, `ILIKE` 키워드 검색으로 fallback한다.

### 3.4 RAG 전체 흐름

```
[문서 인덱싱 - 사전 작업]
문서 업로드
  → 청크 분할 (500자 단위)
  → 각 청크를 AI 임베딩 (1536차원 벡터)
  → DB에 저장 (document_chunks 테이블)

[질의응답 - 실시간]
사용자 질문
  → 질문을 AI 임베딩 (1536차원 벡터)
  → 벡터 유사도 검색 (Top 5 청크)
  → 컨텍스트 조립 ("[Chunk 1]: ... [Chunk 2]: ...")
  → AI에게 컨텍스트 + 질문 전달
  → AI 답변 반환 (출처 포함)
```

### 3.5 Step 1: 문서 인덱싱 상세

**파일: `apps/tenant-api/src/agents/knowledge/knowledge-agent.service.ts`**

```typescript
/** 청크 분할 시 최대 문자 수 */
const CHUNK_MAX_LENGTH = 500;

async indexDocument(documentId: string, content: string): Promise<DocumentChunk[]> {
  // 1. 기존 청크 삭제 (재인덱싱 시 중복 방지)
  await this.deleteDocumentChunks(documentId);

  // 2. 문서를 청크로 분할
  const chunks = this.splitIntoChunks(content);

  const savedChunks: DocumentChunk[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];

    // 3. 각 청크를 임베딩 (AI 호출)
    let embedding: number[] | null = null;
    try {
      embedding = await this.aiGatewayService.generateEmbedding(chunkText);
    } catch (error) {
      // 임베딩 실패해도 텍스트는 저장 (키워드 검색으로 fallback 가능)
      this.logger.warn(`임베딩 생성 실패 (chunk ${i}), fallback to null`);
    }

    // 4. DB에 저장
    const chunk = this.chunkRepository.create({
      documentId,
      chunkIndex: i,
      content: chunkText,
      tokenCount: Math.ceil(chunkText.length / 4), // 대략적 토큰 수 추정
      embedding,
    });
    const saved = await this.chunkRepository.save(chunk);
    savedChunks.push(saved);
  }

  return savedChunks;
}
```

**왜 분할하는가?** LLM에는 컨텍스트 윈도우(한 번에 처리할 수 있는 텍스트 양) 제한이 있다. 10만 자 문서를 통째로 넣을 수 없으므로, 500자 단위로 잘라서 관련 부분만 골라 보내는 것이다.

**청크 분할 로직:**
```typescript
private splitIntoChunks(text: string): string[] {
  // 1. 빈 줄(단락) 기준으로 우선 분할
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    // 2. 현재 청크 + 새 단락이 500자 초과하면 분리
    if (currentChunk.length + paragraph.length > CHUNK_MAX_LENGTH && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + paragraph;
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}
```

**DocumentChunk 엔티티:**

```typescript
// 파일: apps/tenant-api/src/agents/knowledge/entities/document-chunk.entity.ts
@Entity('document_chunks')
export class DocumentChunk extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'chunk_index', type: 'int' })
  chunkIndex: number;

  @Column({ name: 'content', type: 'text' })
  content: string;

  /** 임베딩 벡터. float8[]로 저장, pgvector 캐스팅(::vector)이 가능. */
  @Column({ name: 'embedding', type: 'float8', array: true, nullable: true })
  embedding: number[] | null;

  @Column({ name: 'token_count', type: 'int', default: 0 })
  tokenCount: number;
}
```

### 3.6 Step 2: 벡터 검색 상세

**파일: `apps/tenant-api/src/agents/knowledge/vector-search.service.ts`**

```typescript
async semanticSearch(queryEmbedding: number[], limit: number): Promise<VectorSearchResult[]> {
  const embeddingStr = `[${queryEmbedding.join(',')}]`;  // 배열 → 문자열
  const rows = await this.chunkRepository.query(
    `SELECT *, 1 - (embedding::vector <=> $1::vector) AS score
     FROM document_chunks
     WHERE embedding IS NOT NULL
     ORDER BY embedding::vector <=> $1::vector
     LIMIT $2`,
    [embeddingStr, limit],
  );
  // ...
}
```

**SQL 쿼리 한 줄씩 해석:**

| SQL 부분 | 의미 |
| --- | --- |
| `embedding::vector` | float8 배열을 pgvector 타입으로 캐스팅 |
| `$1::vector` | 검색 쿼리 벡터도 pgvector 타입으로 캐스팅 |
| `<=>` | L2 거리 계산 (0에 가까울수록 유사) |
| `1 - (... <=>)` | 거리를 유사도 점수로 변환 (1에 가까울수록 유사) |
| `WHERE embedding IS NOT NULL` | 임베딩이 없는 청크 제외 |
| `ORDER BY ... <=>` | 가장 유사한 순서로 정렬 |
| `LIMIT $2` | 상위 N개만 반환 |

**왜 Top 5인가?** 너무 많으면 관련 없는 내용(노이즈)이 섞이고, 너무 적으면 답변에 필요한 정보가 부족하다. 5개가 경험적으로 좋은 기본값이다.

### 3.7 Step 3: RAG 질의응답 상세

**파일: `apps/tenant-api/src/agents/knowledge/knowledge-agent.service.ts`**

```typescript
/** RAG 시스템 프롬프트 */
const RAG_SYSTEM_PROMPT = `You are a helpful knowledge assistant. Answer the user's question based ONLY on the provided context. If the context doesn't contain enough information to answer, say so honestly. Always cite which document chunks you used. Respond in the same language as the question.`;

async askQuestion(question: string): Promise<AskQuestionResponseDto> {
  // 1. 질문 임베딩 생성
  let queryEmbedding: number[] | null = null;
  try {
    queryEmbedding = await this.aiGatewayService.generateEmbedding(question);
  } catch (error) {
    this.logger.warn(`질문 임베딩 생성 실패`);
  }

  // 2. 관련 청크 검색 (벡터 검색 → 키워드 fallback)
  let searchResults = queryEmbedding
    ? await this.vectorSearchService.semanticSearch(queryEmbedding, RAG_CONTEXT_CHUNKS)
    : [];

  if (searchResults.length === 0) {
    searchResults = await this.vectorSearchService.keywordSearch(question, RAG_CONTEXT_CHUNKS);
  }

  if (searchResults.length === 0) {
    return AskQuestionResponseDto.from('관련 문서를 찾을 수 없습니다.', []);
  }

  // 3. 컨텍스트 조립
  const contextText = searchResults
    .map((r, i) => `[Chunk ${i + 1} (doc: ${r.chunk.documentId})]:\n${r.chunk.content}`)
    .join('\n\n');

  // 4. AI 호출 (시스템 프롬프트 + 컨텍스트 + 질문)
  const aiResponse = await this.aiGatewayService.chat([
    { role: 'system', content: RAG_SYSTEM_PROMPT },
    { role: 'user', content: `Context:\n${contextText}\n\nQuestion: ${question}` },
  ]);

  // 5. 출처 정보 조립
  const sources = searchResults.map((r) =>
    SourceChunkDto.from(r.chunk.id, r.chunk.documentId, r.chunk.content, r.score),
  );

  return AskQuestionResponseDto.from(aiResponse.content, sources);
}
```

**왜 "컨텍스트에만 기반해서 답하라"고 하는가?** 이 제약이 없으면 LLM이 자기가 학습한 내용을 섞어서 답하는데, 이때 사실이 아닌 내용(할루시네이션)이 포함될 수 있다. "오직 제공된 자료만 참고하라"는 제약으로 정확도를 높인다.

### 3.8 Fallback: 키워드 검색

pgvector가 설치되지 않았거나 임베딩 생성에 실패한 경우, `ILIKE` 키워드 검색으로 동작한다.

```typescript
// 파일: apps/tenant-api/src/agents/knowledge/vector-search.service.ts
async keywordSearch(query: string, limit: number): Promise<VectorSearchResult[]> {
  const chunks = await this.chunkRepository
    .createQueryBuilder('chunk')
    .where('chunk.content ILIKE :query', { query: `%${query}%` })
    .orderBy('chunk.chunkIndex', 'ASC')
    .take(limit)
    .getMany();

  return chunks.map((chunk) => ({ chunk, score: 0.5 })); // 고정 점수
}
```

벡터 검색보다 정확도는 낮지만, 개발 환경에서 pgvector 없이도 RAG 파이프라인을 테스트할 수 있다.

### 3.9 하이브리드 검색

벡터 검색만으로는 부족한 경우가 있다. 예를 들어 "ADR-003"이라는 키워드를 정확히 찾아야 할 때, 의미 기반 검색은 약하다. 이때 벡터 + 키워드를 결합한 **하이브리드 검색**을 사용한다.

```typescript
// 파일: apps/tenant-api/src/agents/knowledge/vector-search.service.ts
async hybridSearch(query: string, queryEmbedding: number[], limit: number): Promise<VectorSearchResult[]> {
  // 두 검색을 병렬 실행
  const [vectorResults, keywordResults] = await Promise.all([
    this.semanticSearch(queryEmbedding, limit),
    this.keywordSearch(query, limit),
  ]);

  // 점수 병합: 벡터 70% + 키워드 30%
  const scoreMap = new Map<string, { chunk: DocumentChunk; score: number }>();

  for (const result of vectorResults) {
    scoreMap.set(result.chunk.id, {
      chunk: result.chunk,
      score: result.score * 0.7,  // 벡터 가중치 70%
    });
  }

  for (const result of keywordResults) {
    const existing = scoreMap.get(result.chunk.id);
    if (existing) {
      existing.score += result.score * 0.3;  // 키워드 가중치 30%
    } else {
      scoreMap.set(result.chunk.id, {
        chunk: result.chunk,
        score: result.score * 0.3,
      });
    }
  }

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
```

### 3.10 성능 최적화 팁

| 최적화 | 방법 | 효과 |
| --- | --- | --- |
| **청크 크기 조절** | 500자 기본. 코드/표 문서는 1000자 | 검색 정확도 향상 |
| **pgvector 인덱스** | `CREATE INDEX ON document_chunks USING ivfflat (embedding vector_l2_ops)` | 대규모 데이터에서 검색 속도 10배 이상 향상 |
| **임베딩 캐싱** | 동일 문서 재인덱싱 시 변경된 청크만 재생성 | AI API 호출 비용 절감 |
| **병렬 임베딩** | `Promise.all()`로 여러 청크 동시 임베딩 | 인덱싱 시간 단축 |

---

## Part 4: AI 모델 연동

### 4.1 AWS Bedrock 개요

AWS Bedrock은 관리형 AI 서비스다. 여러 AI 모델을 API 하나로 호출할 수 있다.

| 용도 | 모델 | 설명 |
| --- | --- | --- |
| 대화/분석 | Claude Sonnet | 고품질 응답 (메인) |
| 대화/분석 | Claude Haiku | 빠른 응답 (fallback) |
| 임베딩 | Titan Embedding | 텍스트 → 1536차원 벡터 |

HaruOS는 Sonnet으로 먼저 시도하고, 실패 시 Haiku로 fallback하는 **멀티모델 전략**을 사용한다.

### 4.2 HaruOS AI Gateway

AI Gateway는 모든 AI 호출을 중앙에서 관리하는 서비스다.

**파일: `apps/tenant-api/src/core/ai-gateway/ai-gateway.service.ts`**
```typescript
@Injectable()
export class AiGatewayService {
  constructor(private readonly aiModel: AiModelPort) {} // Port에만 의존

  async chat(messages: ChatMessageDto[], options?: AiOptionsDto): Promise<AiChatResponseDto> {
    return this.aiModel.chat(messages, options);
  }

  streamChat(messages: ChatMessageDto[], options?: AiOptionsDto): Observable<string> {
    return this.aiModel.streamChat(messages, options);
  }

  async summarize(text: string): Promise<string> {
    return this.aiModel.summarize(text);
  }

  async extractIntent(message: string): Promise<IntentResultDto> {
    return this.aiModel.extractIntent(message);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.aiModel.generateEmbedding(text);
  }
}
```

다른 서비스(KnowledgeAgent, Orchestrator 등)는 `AiGatewayService`만 주입받아 사용한다. 어떤 AI 모델이 뒤에서 호출되는지 알 필요 없다.

### 4.3 SSE 스트리밍

**왜 스트리밍인가?** AI 응답은 수 초가 걸린다. 사용자가 빈 화면을 보며 기다리는 대신, ChatGPT처럼 글자가 하나씩 나타나게 한다.

**NestJS 서버 측:**
```typescript
// 파일: apps/tenant-api/src/haru/orchestrator/orchestrator.service.ts
async processMessageStream(userId: string, dto: ChatRequestDto): Promise<Observable<MessageEvent>> {
  // ... 맥락 조회, 의도 분석 ...

  const stream$: Observable<MessageEvent> = new Observable((subscriber) => {
    // 1. 메타 이벤트 전송 (대화 ID, 에이전트 정보)
    subscriber.next(new MessageEvent('meta', { data: JSON.stringify({...}) }));

    // 2. AI 스트리밍 구독
    this.agentRouter.routeStream(intent, dto.message, context).subscribe({
      next: (chunk) => {
        fullResponse += chunk;
        subscriber.next(new MessageEvent('chunk', { data: chunk })); // 청크 전송
      },
      complete: () => {
        // 3. 전체 응답 DB 저장 후 완료 이벤트
        subscriber.next(new MessageEvent('done', { data: JSON.stringify({...}) }));
        subscriber.complete();
      },
    });
  });

  return stream$;
}
```

**프론트엔드 측 (참고):**
```typescript
// fetch + ReadableStream으로 SSE 수신
const response = await fetch('/api/haru/chat/stream', { method: 'POST', body: ... });
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  // text를 파싱하여 화면에 표시
}
```

---

## Part 5: 실전 가이드

### 5.1 새 에이전트 추가하기

HaruOS의 AI 에이전트 시스템에 새로운 에이전트를 추가하는 방법이다. 예시: "meeting" 에이전트.

**Step 1: 디렉토리 생성**
```
apps/tenant-api/src/agents/meeting/
├── dto/
│   ├── create-meeting.request.dto.ts
│   └── meeting.response.dto.ts
├── entities/
│   └── meeting.entity.ts
├── meeting-agent.service.ts
├── meeting.controller.ts
└── meeting.module.ts
```

**Step 2: Entity 작성**
```typescript
@Entity('meetings')
export class MeetingEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'title' })
  title: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'participants', type: 'jsonb', default: [] })
  participants: string[];
}
```

**Step 3: AgentService 작성 (core 서비스 주입)**
```typescript
@Injectable()
export class MeetingAgentService {
  constructor(
    @InjectRepository(MeetingEntity)
    private readonly meetingRepo: Repository<MeetingEntity>,
    private readonly aiGatewayService: AiGatewayService, // AI Gateway 주입
  ) {}

  async createFromNaturalLanguage(message: string): Promise<MeetingEntity> {
    // AI로 자연어에서 일정 정보 추출 → 엔티티 생성
  }
}
```

**Step 4: Module 작성 (AiGatewayModule import)**
```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([MeetingEntity]),
    AiGatewayModule, // AI Gateway 사용을 위해
  ],
  controllers: [MeetingController],
  providers: [MeetingAgentService],
  exports: [MeetingAgentService],
})
export class MeetingModule {}
```

**Step 5: app.module.ts 등록**
```typescript
@Module({
  imports: [
    // ... 기존 모듈
    MeetingModule,
  ],
})
export class AppModule {}
```

**Step 6: IntentParser에 매핑 추가**

```typescript
// 파일: apps/tenant-api/src/haru/orchestrator/intent-parser.service.ts
private mapIntentToAgent(intent: string): string {
  const intentAgentMap: Record<string, string> = {
    schedule: 'schedule',
    project: 'project',
    document: 'document',
    knowledge: 'knowledge',
    file: 'file',
    meeting: 'meeting', // ← 추가
  };
  return intentAgentMap[intent] ?? 'general';
}
```

**Step 7: AgentRouter에 라우팅 로직 추가**

```typescript
// 파일: apps/tenant-api/src/haru/orchestrator/agent-router.service.ts
async route(intent: ParsedIntent, message: string, context: ChatMessageDto[]): Promise<AgentResponse> {
  switch (intent.agent) {
    case 'meeting': // ← 추가
      return this.handleMeeting(intent, message, context);
    // ...
  }
}
```

### 5.2 새 배치 작업 추가하기

**Step 1: Job 파일 생성**
```typescript
// apps/tenant-api/src/jobs/meeting-reminder.job.ts
@Injectable()
export class MeetingReminderJob {
  private readonly logger = new Logger(MeetingReminderJob.name);

  @Cron('0 */30 * * * *') // 30분마다 실행
  async handleCron() {
    this.logger.log('회의 알림 배치 실행');
    // 30분 후 시작되는 회의를 찾아 알림 발송
  }
}
```

**Step 2: BatchModule에 등록**
```typescript
@Module({
  providers: [MeetingReminderJob],
})
export class BatchModule {}
```

`@Cron()` 데코레이터 표현식 참고:

| 표현식 | 의미 |
| --- | --- |
| `0 */30 * * * *` | 매 30분 |
| `0 0 9 * * *` | 매일 오전 9시 |
| `0 0 0 * * 1` | 매주 월요일 자정 |
| `0 0 */6 * * *` | 6시간마다 |

### 5.3 새 포트/어댑터 추가하기

외부 시스템을 연동할 때 항상 포트/어댑터를 사용한다.

**Step 1: Port 추상 클래스 정의**
```typescript
// ports/notification-sender.port.ts
export abstract class NotificationSenderPort {
  abstract send(userId: string, title: string, body: string): Promise<void>;
}
```

**Step 2: Adapter 구현**
```typescript
// adapters/slack-notification.adapter.ts
@Injectable()
export class SlackNotificationAdapter extends NotificationSenderPort {
  async send(userId: string, title: string, body: string): Promise<void> {
    // Slack API 호출
  }
}
```

**Step 3: Module에서 DI 바인딩**
```typescript
@Module({
  providers: [
    SomeService,
    { provide: NotificationSenderPort, useClass: SlackNotificationAdapter },
  ],
})
export class SomeModule {}
```

**Step 4: Service에서 Port 주입**
```typescript
@Injectable()
export class SomeService {
  constructor(private readonly notificationSender: NotificationSenderPort) {}

  async doSomething() {
    await this.notificationSender.send(userId, '제목', '내용');
    // Slack인지 Email인지 모른다. 관심 없다.
  }
}
```

### 5.4 디버깅 팁

**NestJS Logger 사용법:**
```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class SomeService {
  private readonly logger = new Logger(SomeService.name); // 클래스명이 prefix로 출력

  async doSomething() {
    this.logger.log('정상 로그');          // [SomeService] 정상 로그
    this.logger.warn('경고 로그');         // [SomeService] 경고 로그
    this.logger.error('에러 로그', stack); // [SomeService] 에러 로그 + 스택트레이스
    this.logger.debug('디버그 로그');       // NODE_ENV=development에서만 출력
  }
}
```

**TypeORM 쿼리 로깅:**
```typescript
// app.module.ts의 TypeORM 설정에서
TypeOrmModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    // ...
    logging: config.get('NODE_ENV') === 'development', // 개발 시 SQL 출력
  }),
})
```

**Swagger 테스트:**
- 서버 실행 후 `http://localhost:3000/api/docs` 접속
- 각 API를 브라우저에서 직접 테스트 가능
- "Authorize" 버튼으로 JWT 토큰 설정 후 인증 필요 API 테스트

**curl로 API 테스트:**
```bash
# 회원가입
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"12345678","name":"테스트"}'

# 로그인 → 토큰 받기
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"12345678"}'

# 인증 필요 API 호출
curl -X GET http://localhost:3000/api/some-endpoint \
  -H "Authorization: Bearer <accessToken>"
```

### 5.5 테스트 작성 가이드

**단위 테스트: Service mock 패턴**

HaruOS의 표준 테스트 패턴이다. `auth.service.spec.ts`를 레퍼런스로 사용한다.

```typescript
// 파일: apps/console-api/src/modules/auth/auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<UserEntity>>;
  let mailSender: jest.Mocked<MailSenderPort>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        // Repository mock
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        // Port mock
        {
          provide: MailSenderPort,
          useValue: {
            sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
          },
        },
        // NestJS 내장 서비스 mock
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(UserEntity));
    mailSender = module.get(MailSenderPort);
  });

  // 정상 케이스
  it('새 사용자를 생성하고 인증 메일을 발송한다', async () => {
    userRepo.findOne.mockResolvedValue(null); // 중복 없음
    userRepo.create.mockReturnValue(mockUser as UserEntity);
    userRepo.save.mockResolvedValue(mockUser as UserEntity);

    const result = await service.signup({ email: 'test@test.com', password: '12345678', name: '테스트' });

    expect(result.email).toBe('test@test.com');
    expect(mailSender.sendVerificationEmail).toHaveBeenCalledWith('test@test.com', expect.any(String));
  });

  // 에러 케이스
  it('이메일 중복 시 DuplicateResourceException을 던진다', async () => {
    userRepo.findOne.mockResolvedValue(mockUser as UserEntity); // 중복 있음

    await expect(
      service.signup({ email: 'test@test.com', password: '12345678', name: '테스트' }),
    ).rejects.toThrow(DuplicateResourceException);
  });
});
```

**테스트 작성 체크리스트:**

- [ ] 정상 케이스 (happy path)
- [ ] 에러 케이스 (존재하지 않음, 중복, 권한 없음, 입력 오류)
- [ ] 경계값 (빈 문자열, 최대 길이, null)
- [ ] 외부 서비스 실패 시 fallback 동작

**테스트 실행:**
```bash
# 전체 테스트
npm run test

# 특정 파일만
npx jest --testPathPattern=auth.service.spec

# 감시 모드 (파일 변경 시 자동 재실행)
npm run test:watch
```

---

## 부록: 자주 묻는 질문

**Q: Module, Controller, Service 중 어디에 로직을 넣어야 하나?**
- Controller: HTTP 요청 파싱, 응답 반환만. 비즈니스 로직 절대 금지.
- Service: 모든 비즈니스 로직. DB 조회, 검증, 변환 등.
- Module: DI 설정만. 로직 없음.

**Q: Repository를 별도 클래스로 만들어야 하나?**
- 단순 CRUD면 TypeORM의 `Repository<Entity>`를 직접 주입하면 충분하다.
- 복잡한 쿼리가 반복되면 Custom Repository 클래스를 만든다.

**Q: 여러 Service를 조합해야 할 때?**
- Facade 패턴 사용. `XxxFacadeService`에서 여러 Service를 조합한다.
- 단일 Service 호출이면 Facade 불필요.

**Q: 환경변수는 어떻게 관리하나?**
- `.env` 파일에 정의, `ConfigService`로 읽는다.
- 코드에 하드코딩 절대 금지. API 키, 비밀번호는 반드시 환경변수.
- `.env.example`로 필요한 변수 목록을 문서화한다.

**Q: API 응답 형식은?**
- 모든 응답은 `ApiResponseInterceptor`가 자동으로 래핑한다.
```json
{
  "success": true,
  "code": "OK",
  "message": "Success",
  "data": { ... },
  "timestamp": "2026-03-24T10:00:00.000Z"
}
```
- Controller에서는 `data` 부분만 반환하면 된다.

---

## 참고 파일 경로

| 분류 | 파일 |
| --- | --- |
| 앱 시작점 | `apps/console-api/src/main.ts` |
| 루트 모듈 | `apps/console-api/src/app.module.ts` |
| 공통 BaseEntity | `apps/console-api/src/common/entities/base.entity.ts` |
| 예외 계층 | `apps/console-api/src/common/exceptions/` |
| 전역 필터 | `apps/console-api/src/common/filters/global-exception.filter.ts` |
| 응답 인터셉터 | `apps/console-api/src/common/interceptors/api-response.interceptor.ts` |
| JWT 가드 | `apps/console-api/src/common/guards/jwt-auth.guard.ts` |
| Auth 모듈 (레퍼런스) | `apps/console-api/src/modules/auth/` |
| AI Gateway 포트 | `apps/tenant-api/src/core/ai-gateway/ports/ai-model.port.ts` |
| Bedrock 어댑터 | `apps/tenant-api/src/core/ai-gateway/adapters/bedrock.adapter.ts` |
| Knowledge Agent | `apps/tenant-api/src/agents/knowledge/knowledge-agent.service.ts` |
| 벡터 검색 | `apps/tenant-api/src/agents/knowledge/vector-search.service.ts` |
| 오케스트레이터 | `apps/tenant-api/src/haru/orchestrator/orchestrator.service.ts` |
| 인텐트 파서 | `apps/tenant-api/src/haru/orchestrator/intent-parser.service.ts` |
| 에이전트 라우터 | `apps/tenant-api/src/haru/orchestrator/agent-router.service.ts` |
| 프로젝트 규칙 | `CLAUDE.md` |
