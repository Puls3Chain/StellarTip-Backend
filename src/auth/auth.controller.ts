import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthThrottle } from '../config/throttle.config';
import { User } from '../entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login with Stellar wallet address' })
  @Post('stellar/login')
  @AuthThrottle()
  async loginStellar(@Body('walletAddress') walletAddress: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: Record<string, unknown>;
  }> {
    if (!walletAddress || typeof walletAddress !== 'string') {
      throw new HttpException(
        'walletAddress is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    const normalized = walletAddress.trim();
    if (!normalized.startsWith('G') || normalized.length < 56) {
      throw new HttpException(
        'Invalid Stellar wallet address format',
        HttpStatus.BAD_REQUEST,
      );
    }
    const user = await this.authService.validateStellarUser(normalized);
    return this.authService.login(user);
  }

  @ApiOperation({ summary: 'Get authentication nonce for Stellar wallet' })
  @Get('nonce')
  @AuthThrottle()
  getNonce(@Query('walletAddress') walletAddress: string): {
    nonce: string;
    message: string;
  } {
    if (!walletAddress) {
      throw new HttpException(
        'walletAddress is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.authService.getNonce(walletAddress);
  }

  @ApiOperation({ summary: 'Create a new account' })
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

  @ApiOperation({ summary: 'Login with email and password' })
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

  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    if (!refreshToken) {
      throw new HttpException(
        'refresh_token is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.authService.refreshToken(refreshToken);
  }

  @ApiOperation({ summary: 'Get current user profile from JWT' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request): User | undefined {
    return req.user;
  }
}
