/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, AuthMethod, UserRole } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

const VALID_STELLAR_ADDRESS =
  'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH';

describe('AuthService', () => {
  let service: AuthService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let usersRepository: any;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let refreshTokensRepository: any;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // ─── getNonce ────────────────────────────────────────────────
  describe('getNonce', () => {
    it('should return a nonce string and formatted message with wallet address', () => {
      const result = service.getNonce(VALID_STELLAR_ADDRESS);

      expect(result.nonce).toBeDefined();
      expect(typeof result.nonce).toBe('string');
      expect(result.message).toContain('StellarTip Authentication');
      expect(result.message).toContain(VALID_STELLAR_ADDRESS);
      expect(result.message).toContain(result.nonce);
    });

    it('should produce valid nonce values on repeated calls', () => {
      const result1 = service.getNonce(VALID_STELLAR_ADDRESS);
      const result2 = service.getNonce(VALID_STELLAR_ADDRESS);

      // Nonce is random; expect them to differ most of the time
      expect(result1.nonce).toBeDefined();
      expect(result2.nonce).toBeDefined();
    });

    it('should include wallet address in the message', () => {
      const addr = 'GANOTHERADDRESS12345678901234567890123456789012';
      const result = service.getNonce(addr);

      expect(result.message).toContain(addr);
    });
  });

  // ─── validateStellarUser ─────────────────────────────────────
  describe('validateStellarUser', () => {
    it('should create a new user for a new wallet address', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);
      mockUsersRepository.create.mockReturnValue(mockUser);
      mockUsersRepository.save.mockResolvedValue(mockUser);

      const result = await service.validateStellarUser(VALID_STELLAR_ADDRESS);

      expect(result).toEqual(mockUser);
    });

    it('should set AuthMethod.STELLAR and isActive on new user', async () => {
      const createdUser = {
        id: 'new-stellar',
        walletAddress: VALID_STELLAR_ADDRESS,
        username: 'stellar_aaaaaaah',
        displayName: 'Stellar User AAAH',
        authMethod: AuthMethod.STELLAR,
        isActive: true,
      };
      mockUsersRepository.findOne.mockResolvedValue(null);
      mockUsersRepository.create.mockReturnValue(createdUser);
      mockUsersRepository.save.mockResolvedValue(createdUser);

      const result = await service.validateStellarUser(VALID_STELLAR_ADDRESS);

      expect(result.authMethod).toBe(AuthMethod.STELLAR);
      expect(result.isActive).toBe(true);
      expect(result.walletAddress).toBe(VALID_STELLAR_ADDRESS);
    });

    it('should generate a username from last 8 chars of wallet', async () => {
      let capturedUsername: string | undefined;
      mockUsersRepository.findOne.mockResolvedValue(null);
      mockUsersRepository.create.mockImplementation((data: any) => {
        capturedUsername = data.username;
        return mockUser;
      });
      mockUsersRepository.save.mockResolvedValue(mockUser);

      await service.validateStellarUser(VALID_STELLAR_ADDRESS);

      expect(capturedUsername).toBe(
        'stellar_' + VALID_STELLAR_ADDRESS.slice(-8).toLowerCase(),
      );
    });

    it('should return existing user for known wallet', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateStellarUser(VALID_STELLAR_ADDRESS);

      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.create).not.toHaveBeenCalled();
    });

    it('should throw on address not starting with G', async () => {
      await expect(
        service.validateStellarUser(
          'HAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        ),
      ).rejects.toThrow('Invalid Stellar wallet address');
    });

    it('should throw on address with wrong length', async () => {
      await expect(service.validateStellarUser('GABC')).rejects.toThrow(
        'Invalid Stellar wallet address',
      );
    });
  });

  // ─── signup ──────────────────────────────────────────────────
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
      expect(result.expires_in).toBe(900);
    });

    it('should set displayName to username when not provided', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      let capturedData: any;
      mockUsersRepository.create.mockImplementation((data: any) => {
        capturedData = data;
        return { ...mockUser, ...data };
      });
      mockUsersRepository.save.mockResolvedValue(mockUser);
      mockRefreshTokensRepository.save.mockResolvedValue(mockRefreshToken);

      await service.signup('new@example.com', 'pass123', 'nodisplay');

      expect(capturedData.displayName).toBe('nodisplay');
    });

    it('should hash the password with bcrypt', async () => {
      let hashedPassword: string | undefined;
      mockUsersRepository.findOne.mockResolvedValue(null);
      mockUsersRepository.create.mockImplementation((data: any) => {
        hashedPassword = data.password;
        return mockUser;
      });
      mockUsersRepository.save.mockResolvedValue(mockUser);
      mockRefreshTokensRepository.save.mockResolvedValue(mockRefreshToken);

      await service.signup('test@example.com', 'password123', 'testuser');

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe('password123');
      const isValid = await bcrypt.compare('password123', hashedPassword!);
      expect(isValid).toBe(true);
    });

    it('should return user object with email', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);
      mockUsersRepository.create.mockReturnValue(mockUser);
      mockUsersRepository.save.mockResolvedValue(mockUser);
      mockRefreshTokensRepository.save.mockResolvedValue(mockRefreshToken);

      const result = await service.signup(
        'test@example.com',
        'password123',
        'testuser',
      );

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.username).toBe('testuser');
      expect(result.user.role).toBe(UserRole.USER);
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

    it('should create user with USER role', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      let capturedRole: string | undefined;
      mockUsersRepository.create.mockImplementation((data: any) => {
        capturedRole = data.role;
        return mockUser;
      });
      mockUsersRepository.save.mockResolvedValue(mockUser);
      mockRefreshTokensRepository.save.mockResolvedValue(mockRefreshToken);

      await service.signup('new@example.com', 'pass', 'newuser');

      expect(capturedRole).toBe(UserRole.USER);
    });
  });

  // ─── login ───────────────────────────────────────────────────
  describe('login', () => {
    it('should return access token, refresh token, and user payload', async () => {
      mockRefreshTokensRepository.save.mockResolvedValue(mockRefreshToken);

      const result = await service.login(mockUser);

      expect(result.access_token).toBe('test-access-token');
      expect(result.refresh_token).toBeDefined();
      expect(result.expires_in).toBe(900);
      expect(result.user).toBeDefined();
    });

    it('should include all user fields in the response', async () => {
      mockRefreshTokensRepository.save.mockResolvedValue(mockRefreshToken);

      const result = await service.login(mockUser);

      expect(result.user).toMatchObject({
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        walletAddress: null,
        authMethod: AuthMethod.EMAIL,
        role: UserRole.USER,
      });
    });

    it('should sign JWT with sub, role, and authMethod', async () => {
      mockRefreshTokensRepository.save.mockResolvedValue(mockRefreshToken);

      await service.login(mockUser);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          role: UserRole.USER,
          authMethod: AuthMethod.EMAIL,
        }),
        expect.any(Object),
      );
    });

    it('should include expiresIn in JWT sign options', async () => {
      mockRefreshTokensRepository.save.mockResolvedValue(mockRefreshToken);

      await service.login(mockUser);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: '15m' }),
      );
    });

    it('should create a refresh token for the user', async () => {
      mockRefreshTokensRepository.save.mockResolvedValue(mockRefreshToken);

      await service.login(mockUser);

      expect(mockRefreshTokensRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
      );
    });
  });

  // ─── loginWithEmail ──────────────────────────────────────────
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

    it('should throw on user not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.loginWithEmail('nonexistent@example.com', 'password123'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw when user has no password set', async () => {
      const userNoPassword = { ...mockUser, password: null };
      mockUsersRepository.findOne.mockResolvedValue(userNoPassword);

      await expect(
        service.loginWithEmail('test@example.com', 'password123'),
      ).rejects.toThrow('Invalid credentials');
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

    it('should return user object with email in response', async () => {
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

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.username).toBe('testuser');
      expect(result.user.role).toBe(UserRole.USER);
    });

    it('should use bcrypt.compare to verify password', async () => {
      const userWithPassword = {
        ...mockUser,
        password: await bcrypt.hash('password123', 10),
      };
      mockUsersRepository.findOne.mockResolvedValue(userWithPassword);
      mockRefreshTokensRepository.save.mockResolvedValue(mockRefreshToken);

      const compareSpy = jest.spyOn(bcrypt, 'compare');

      await service.loginWithEmail('test@example.com', 'password123');

      expect(compareSpy).toHaveBeenCalledWith(
        'password123',
        userWithPassword.password,
      );
      compareSpy.mockRestore();
    });
  });

  // ─── refreshToken ────────────────────────────────────────────
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

    it('should revoke old token before issuing new one (single-use)', async () => {
      mockRefreshTokensRepository.findOne.mockResolvedValue(mockRefreshToken);
      mockRefreshTokensRepository.update.mockResolvedValue({ affected: 1 });
      mockRefreshTokensRepository.save.mockResolvedValue({
        ...mockRefreshToken,
        token: 'rotated-token',
      });

      await service.refreshToken('abc123refresh');

      // Old token must be revoked first
      expect(mockRefreshTokensRepository.update).toHaveBeenCalled();
      expect(mockRefreshTokensRepository.save).toHaveBeenCalled();
      const updateCallOrder =
        mockRefreshTokensRepository.update.mock.invocationCallOrder[0];
      const saveCallOrder =
        mockRefreshTokensRepository.save.mock.invocationCallOrder[0];
      expect(updateCallOrder).toBeLessThan(saveCallOrder);
    });

    it('should throw on invalid refresh token', async () => {
      mockRefreshTokensRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('should throw on revoked refresh token', async () => {
      // findOne with isRevoked: false won't find revoked tokens
      mockRefreshTokensRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshToken('revoked-token')).rejects.toThrow(
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

  // ─── revokeUserRefreshTokens ─────────────────────────────────
  describe('revokeUserRefreshTokens', () => {
    it('should revoke all active refresh tokens for a user', async () => {
      mockRefreshTokensRepository.update.mockResolvedValue({ affected: 3 });

      await service.revokeUserRefreshTokens('user-1');

      expect(mockRefreshTokensRepository.update).toHaveBeenCalledWith(
        { userId: 'user-1', isRevoked: false },
        { isRevoked: true },
      );
    });

    it('should handle zero tokens gracefully', async () => {
      mockRefreshTokensRepository.update.mockResolvedValue({ affected: 0 });

      await expect(
        service.revokeUserRefreshTokens('user-without-tokens'),
      ).resolves.toBeUndefined();
    });

    it('should only revoke un-revoked tokens', async () => {
      mockRefreshTokensRepository.update.mockResolvedValue({ affected: 1 });

      await service.revokeUserRefreshTokens('user-1');

      expect(mockRefreshTokensRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ isRevoked: false }),
        expect.objectContaining({ isRevoked: true }),
      );
    });
  });
});
