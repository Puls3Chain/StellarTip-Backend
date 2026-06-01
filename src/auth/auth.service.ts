import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { User, AuthMethod, UserRole } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

@Injectable()
export class AuthService {
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresInDays: number;

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokensRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.accessTokenExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m';
    this.refreshTokenExpiresInDays = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRATION_DAYS') || '30',
      10,
    );
  }

  async validateStellarUser(walletAddress: string) {
    if (!walletAddress.startsWith('G') || walletAddress.length !== 56) {
      throw new UnauthorizedException('Invalid Stellar wallet address');
    }

    let user = await this.usersRepository.findOne({
      where: { walletAddress },
    });

    if (!user) {
      const username = `stellar_${walletAddress.slice(-8).toLowerCase()}`;

      user = this.usersRepository.create({
        walletAddress,
        username,
        displayName: `Stellar User ${walletAddress.slice(-4)}`,
        authMethod: AuthMethod.STELLAR,
        isActive: true,
      });
      await this.usersRepository.save(user);
    }

    return user;
  }

  async login(user: User) {
    const payload = {
      sub: user.id,
      role: user.role,
      authMethod: user.authMethod,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: this.accessTokenExpiresIn });
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: this.parseExpiresIn(this.accessTokenExpiresIn),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        walletAddress: user.walletAddress,
        authMethod: user.authMethod,
        role: user.role,
      },
    };
  }

  async signup(email: string, password: string, username: string, displayName?: string) {
    const existingEmail = await this.usersRepository.findOne({ where: { email } });
    if (existingEmail) {
      throw new ConflictException('Email already in use');
    }

    const existingUsername = await this.usersRepository.findOne({ where: { username } });
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      username,
      displayName: displayName || username,
      authMethod: AuthMethod.EMAIL,
      role: UserRole.USER,
      isActive: true,
    });

    await this.usersRepository.save(user);

    const payload = { sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: this.accessTokenExpiresIn });
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: this.parseExpiresIn(this.accessTokenExpiresIn),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async loginWithEmail(email: string, password: string) {
    const user = await this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'username', 'displayName', 'role', 'authMethod', 'isActive'],
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const payload = { sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: this.accessTokenExpiresIn });
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: this.parseExpiresIn(this.accessTokenExpiresIn),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshToken(token: string) {
    const refreshToken = await this.refreshTokensRepository.findOne({
      where: { token, isRevoked: false },
      relations: ['user'],
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > refreshToken.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (!refreshToken.user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Rotate the refresh token (single-use)
    await this.refreshTokensRepository.update(refreshToken.id, { isRevoked: true });

    const payload = { sub: refreshToken.user.id, role: refreshToken.user.role };
    const newAccessToken = this.jwtService.sign(payload, { expiresIn: this.accessTokenExpiresIn });
    const newRefreshToken = await this.createRefreshToken(refreshToken.user.id);

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_in: this.parseExpiresIn(this.accessTokenExpiresIn),
    };
  }

  async revokeUserRefreshTokens(userId: string) {
    await this.refreshTokensRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  async getNonce(walletAddress: string) {
    const nonce = Math.floor(Math.random() * 1000000).toString();
    const message = `StellarTip Authentication\n\nWallet: ${walletAddress}\nNonce: ${nonce}\n\nSign this message to authenticate with StellarTip.`;

    return { nonce, message };
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenExpiresInDays);

    await this.refreshTokensRepository.save({
      userId,
      token,
      expiresAt,
    });

    return token;
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900;
    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }
}
