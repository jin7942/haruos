import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupRequestDto } from './dto/signup.request.dto';
import { LoginRequestDto } from './dto/login.request.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupRequestDto) {}

  @Post('login')
  login(@Body() dto: LoginRequestDto) {}

  @Post('verify-email')
  verifyEmail() {}
}
