import { Test, TestingModule } from '@nestjs/testing';
import { StellarStrategy } from './stellar.strategy';
import { AuthService } from '../auth.service';

const mockValidateStellarUser = jest.fn();

describe('StellarStrategy', () => {
  let strategy: StellarStrategy;

  beforeEach(async () => {
    mockValidateStellarUser.mockReset();
    mockValidateStellarUser.mockResolvedValue({
      id: 'test-id',
      username: 'test_user',
      walletAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarStrategy,
        {
          provide: AuthService,
          useValue: {
            validateStellarUser: mockValidateStellarUser,
          },
        },
      ],
    }).compile();

    strategy = module.get<StellarStrategy>(StellarStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should throw UnauthorizedException if walletAddress is missing', async () => {
      const req = { body: { message: 'test', signature: 'test' } };
      await expect(strategy.validate(req)).rejects.toThrow(
        'Missing required fields',
      );
    });

    it('should throw UnauthorizedException if message is missing', async () => {
      const req = { body: { walletAddress: 'G...', signature: 'test' } };
      await expect(strategy.validate(req)).rejects.toThrow(
        'Missing required fields',
      );
    });

    it('should throw UnauthorizedException if signature is missing', async () => {
      const req = { body: { walletAddress: 'G...', message: 'test' } };
      await expect(strategy.validate(req)).rejects.toThrow(
        'Missing required fields',
      );
    });

    it('should call validateStellarUser on successful verification', async () => {
      // Mock the verifyStellarSignature method to return true
      jest
        .spyOn(strategy as any, 'verifyStellarSignature')
        .mockResolvedValue(true);

      const req = {
        body: {
          walletAddress:
            'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
          message: 'test message',
          signature: 'test-signature',
        },
      };

      const result = await strategy.validate(req);
      expect(result).toBeDefined();
      expect(result.id).toBe('test-id');
      expect(mockValidateStellarUser).toHaveBeenCalledWith(
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      );
    });

    it('should throw UnauthorizedException if signature is invalid', async () => {
      jest
        .spyOn(strategy as any, 'verifyStellarSignature')
        .mockResolvedValue(false);

      const req = {
        body: {
          walletAddress:
            'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
          message: 'test message',
          signature: 'invalid-signature',
        },
      };

      await expect(strategy.validate(req)).rejects.toThrow('Invalid signature');
    });
  });
});
