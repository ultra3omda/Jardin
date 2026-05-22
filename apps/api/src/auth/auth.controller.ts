import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuthResponseDto, MeResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { EmailVerificationService } from './email-verification.service';
import { getRequestMeta } from './utils/request-meta.utils';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tenant and its initial school_admin user' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  async register(@Body() dto: RegisterDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.auth.register(dto, getRequestMeta(req));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.auth.login(dto, getRequestMeta(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async refresh(@Body() dto: RefreshDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.auth.refresh(dto.refreshToken, getRequestMeta(req));
  }

  @Post('logout')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  @ApiResponse({ status: 204 })
  async logout(@Body() dto: RefreshDto, @Req() req: Request): Promise<void> {
    return this.auth.logout(dto.refreshToken, getRequestMeta(req));
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Return the authenticated user and their tenant' })
  @ApiResponse({ status: 200, type: MeResponseDto })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<MeResponseDto> {
    return this.auth.me(user.id);
  }

  @Public()
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consume an email verification token (V1.5)' })
  @ApiResponse({ status: 200 })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() req: Request,
  ): Promise<{ verified: true; userId: string }> {
    const { userId } = await this.emailVerification.consume(dto.token, getRequestMeta(req));
    return { verified: true, userId };
  }

  @Post('email/resend')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Resend the email verification email for the current user' })
  @ApiResponse({ status: 204 })
  async resendVerificationEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<void> {
    await this.auth.resendVerificationEmail(user.id, getRequestMeta(req));
  }
}
