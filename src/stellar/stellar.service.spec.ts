import { Test, TestingModule } from '@nestjs/testing';
import { StellarService } from './stellar.service';
import { ConfigService } from '@nestjs/config';

jest.mock('@stellar/stellar-sdk', () => {
  const mockLoadAccount = jest.fn();
  const mockTransactionCall = jest.fn();

  return {
    Horizon: {
      Server: jest.fn().mockImplementation(() => ({
        loadAccount: mockLoadAccount,
        transactions: jest.fn().mockReturnValue({
          transaction: jest.fn().mockReturnValue({
            call: mockTransactionCall,
          }),
        }),
      })),
    },
    Networks: {
      TESTNET: 'TESTNET',
      PUBLIC: 'PUBLIC',
    },
  };
});

describe('StellarService', () => {
  let service: StellarService;

  const createMockAccount = () => ({
    balances: [
      {
        asset_type: 'native',
        balance: '100.0000000',
      },
      {
        asset_type: 'credit_alphanum4',
        asset_code: 'USDC',
        asset_issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        balance: '50.0000000',
      },
    ],
    sequenceNumber: '123456789',
    subentry_count: 2,
  });

  const createMockTx = () => ({
    source_account: 'GSOURCE...',
    operations: [
      {
        to: 'GDEST...',
        amount: '10.0000000',
        asset_type: 'native',
      },
    ],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StellarService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'STELLAR_NODE_URL')
                return 'https://horizon-testnet.stellar.org';
              if (key === 'STELLAR_NETWORK') return 'TESTNET';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StellarService>(StellarService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAccountBalance', () => {
    it('should return balances for a valid address', async () => {
      (service as any).server.loadAccount.mockResolvedValue(
        createMockAccount(),
      );

      const result = await service.getAccountBalance(
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      );

      expect(result.balances).toHaveLength(2);
      expect(result.balances[0]).toEqual({
        asset: 'XLM',
        balance: '100.0000000',
      });
      expect(result.balances[1].asset).toContain('USDC');
    });

    it('should return empty balances on error', async () => {
      (service as any).server.loadAccount.mockRejectedValue(
        new Error('Account not found'),
      );

      const result = await service.getAccountBalance('GINVALID...');
      expect(result.balances).toEqual([]);
    });
  });

  describe('getAccountInfo', () => {
    it('should return account info for a valid address', async () => {
      (service as any).server.loadAccount.mockResolvedValue(
        createMockAccount(),
      );

      const result = await service.getAccountInfo(
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      );

      expect(result.exists).toBe(true);
      expect(result.sequenceNumber).toBe('123456789');
      expect(result.subentryCount).toBe(2);
      expect(result.network).toBe('TESTNET');
    });

    it('should return exists: false on error', async () => {
      (service as any).server.loadAccount.mockRejectedValue(
        new Error('Account not found'),
      );

      const result = await service.getAccountInfo('GINVALID...');
      expect(result.exists).toBe(false);
    });
  });

  describe('verifyPayment', () => {
    it('should verify a valid transaction', async () => {
      // Mock the transaction call
      const txBuilder = (service as any).server.transactions();
      txBuilder.transaction('valid-tx-hash').call.mockResolvedValue(
        createMockTx(),
      );

      const result = await service.verifyPayment('valid-tx-hash');

      expect(result.verified).toBe(true);
      expect(result.from).toBe('GSOURCE...');
      expect(result.amount).toBe(10);
      expect(result.asset).toBe('XLM');
    });

    it('should return verified: false on error', async () => {
      const txBuilder = (service as any).server.transactions();
      txBuilder
        .transaction('invalid-hash')
        .call.mockRejectedValue(new Error('Transaction not found'));

      const result = await service.verifyPayment('invalid-hash');
      expect(result.verified).toBe(false);
    });
  });
});
