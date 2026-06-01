import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, AuthMethod, UserRole } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

const VALID_STELLAR_ADDRESS = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: any;
  let refreshTokensRepository: any;
  let jwtService: any;

  const mockUser: any = {
    id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    bio: null,
    avatarUrl: null,
    walletAddress: null,
    authMethod: AuthMethod.EMAIL,
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    receivedTips: [],
    sentTips: [],
  };

  const mockRefreshToken: any = {
    id: 'rt-1',
    userId: 'user-1',
    token: 'abc123refresh',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isRevoked: false,
    createdAt: new Date(),
    user: mockUser,
  };

  const mockUsersRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRefreshTokensRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('test-access-token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_EXPIRATION') return '15m';
      if (key === 'JWT_REFRESH_EXPIRATION_DAYS') return '30';
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokensRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateStellarUser', () => {
    it('should create a new user for a new wallet address', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);
      mockUsersRepository.create.mockReturnValue(mockUser);
      mockUsersRepository.save.mockResolvedValue(mockUser);

      const result = await service.validateStellarUser(VALID_STELLAR_ADDRESS);

      expect(result).toEqual(mockUser);
    });

    it('should return existing user for known wallet', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateStellarUser(VALID_STELLAR_ADDRESS);

      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.create).not.toHaveBeenCalled();
    });

    it('should throw on invalid wallet address', async () => {
      await expect(service.validateStellarUser('invalid')).rejects.toThrow(
        'Invalid Stellar wallet address',
      );
    });
  });

  describe('login', () => {
    it('should return access token and refresh token', async () => {
      mockRefreshTokensRepository.save.mockResolvedValue(mockRefreshToken);

      const result = await service.login(mockUser);

      expect(result.access_token).toBe('test-access-token');
      expect(result.refresh_token).toBeDefined();
      expect(result.expires_in).toBe(900);
      expect(result.user).toBeDefined();
    });
  });

  describe('refreshToken', () => {
    it('should rotate tokens on valid refresh', async () => {
      mockRefreshTokensRepository.findOne.mockResolvedValue(mockRefreshToken);
      mockRefreshTokensRepository.update.mockResolvedValue({ affected: 1 });
      mockRefreshTokensRepository.save.mockResolvedValue({
        ...mockRefreshToken,
        token: 'new-refresh-token',
      });

      const result = await service.refreshToken('abc123refresh');

      expect(result.access_token).toBe('test-access-token');
      expect(result.refresh_token).toBeDefined();
      expect(mockRefreshTokensRepository.update).toHaveBeenCalledWith('rt-1', {
        isRevoked: true,
      });
    });

    it('should throw on invalid refresh token', async () => {
      mockRefreshTokensRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw on expired refresh token', async () => {
      const expiredToken = {
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000),
      };
      mockRefreshTokensRepository.findOne.mockResolvedValue(expiredToken);

      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        'Refresh token has expired',
      );
    });

    it('should throw on deactivated user', async () => {
      const deactivatedUserRefresh = {
        ...mockRefreshToken,
        user: { ...mockUser, isActive: false },
      };
      mockRefreshTokensRepository.findOne.mockResolvedValue(
        deactivatedUserRefresh,
      );

      await expect(service.refreshToken('deactivated-token')).rejects.toThrow(
        'Account is deactivated',
      );
    });
  });

  describe('revokeUserRefreshTokens', () => {
    it('should revoke all refresh tokens for a user', async () => {
      mockRefreshTokensRepository.update.mockResolvedValue({ affected: 3 });

      await service.revokeUserRefreshTokens('user-1');

      expect(mockRefreshTokensRepository.update).toHaveBeenCalledWith(
        { userId: 'user-1', isRevoked: false },
        { isRevoked: true },
      );
    });
  });

  describe('signup', () => {
    it('should create user and return tokens', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);
      mockUsersRepository.create.mockReturnValue(mockUser);
      mockUsersRepository.save.mockResolvedValue(mockUser);
      mockRefreshTokensRepository.save.mockResolvedValue(mockRefreshToken);

      const result = await service.signup(
        'test@example.com',
        'password123',
        'testuser',
        'Test User',
      );

      expect(result.access_token).toBe('test-access-token');
      expect(result.refresh_token).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.signup('test@example.com', 'password123', 'newuser'),
      ).rejects.toThrow('Email already in use');
    });

    it('should reject duplicate username', async () => {
      mockUsersRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);

      await expect(
        service.signup('unique@example.com', 'password123', 'testuser'),
      ).rejects.toThrow('Username already taken');
    });
  });

  describe('loginWithEmail', () => {
    it('should return tokens on valid credentials', async () => {
      const userWithPassword = {
        ...mockUser,
        password: await bcrypt.hash('password123', 10),
      };
      mockUsersRepository.findOne.mockResolvedValue(userWithPassword);
      mockRefreshTokensRepository.save.mockResolvedValue(mockRefreshToken);

      const result = await service.loginWithEmail(
        'test@example.com',
        'password123',
      );

      expect(result.access_token).toBe('test-access-token');
      expect(result.refresh_token).toBeDefined();
    });

    it('should throw on invalid password', async () => {
      const userWithPassword = {
        ...mockUser,
        password: await bcrypt.hash('password123', 10),
      };
      mockUsersRepository.findOne.mockResolvedValue(userWithPassword);

      await expect(
        service.loginWithEmail('test@example.com', 'wrongpassword'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw on deactivated user', async () => {
      const deactivatedUser = {
        ...mockUser,
        password: await bcrypt.hash('password123', 10),
        isActive: false,
      };
      mockUsersRepository.findOne.mockResolvedValue(deactivatedUser);

      await expect(
        service.loginWithEmail('test@example.com', 'password123'),
      ).rejects.toThrow('Account is deactivated');
    });
  });
});
