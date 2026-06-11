import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthThrottle } from '../config/throttle.config';
import { User } from '../entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('stellar/login')
  @AuthThrottle()
  async loginStellar(@Body('walletAddress') walletAddress: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: Record<string, unknown>;
  }> {
    if (!walletAddress || typeof walletAddress !== 'string') {
      throw new Error('walletAddress is required');
    }
    const normalized = walletAddress.trim();
    if (!normalized.startsWith('G') || normalized.length < 56) {
      throw new Error('Invalid Stellar wallet address format');
    }
    const user = await this.authService.validateStellarUser(normalized);
    return this.authService.login(user);
  }

  @Get('nonce')
  @AuthThrottle()
  getNonce(@Query('walletAddress') walletAddress: string): {
    nonce: string;
    message: string;
  } {
    if (!walletAddress) {
      throw new Error('walletAddress is required');
    }
    return this.authService.getNonce(walletAddress);
  }

  @Post('signup')
  @AuthThrottle()
  async signup(@Body() signupDto: SignupDto): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: Record<string, unknown>;
  }> {
    return this.authService.signup(
      signupDto.email,
      signupDto.password,
      signupDto.username,
      signupDto.displayName,
    );
  }

  @Post('login')
  @AuthThrottle()
  async login(@Body() loginDto: LoginDto): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: Record<string, unknown>;
  }> {
    return this.authService.loginWithEmail(loginDto.email, loginDto.password);
  }

  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    if (!refreshToken) {
      throw new Error('refresh_token is required');
    }
    return this.authService.refreshToken(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request): User | undefined {
    return req.user;
  }
}
