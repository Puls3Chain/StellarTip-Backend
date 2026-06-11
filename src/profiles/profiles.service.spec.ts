/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProfilesService } from './profiles.service';
import { User } from '../entities/user.entity';
import { Tip } from '../entities/tip.entity';

describe('ProfilesService', () => {
  let service: ProfilesService;
  let usersRepository: any;
  let tipsRepository: any;

  const mockUser: any = {
    id: 'user-1',
    username: 'creator',
    displayName: 'Creator Name',
    bio: 'A creator bio',
    avatarUrl: null,
    walletAddress: 'GRECEIVER...',
    isActive: true,
    createdAt: new Date(),
  };

  const mockUsersRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockTipsRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(Tip),
          useValue: mockTipsRepository,
        },
      ],
    }).compile();

    service = module.get<ProfilesService>(ProfilesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return a profile by username', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getProfile('creator');
      expect(result).toEqual(mockUser);
    });

    it('should throw on inactive or missing user', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.getProfile('unknown')).rejects.toThrow(
        'Profile not found',
      );
    });
  });

  describe('searchProfiles', () => {
    it('should return matching profiles', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };
      mockUsersRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.searchProfiles('creator');
      expect(result).toHaveLength(1);
      expect(qb.getMany).toHaveBeenCalled();
    });
  });

  describe('getAnalytics', () => {
    const mockSummary = {
      totalTips: '5',
      totalAmount: '250.0000000',
      averageAmount: '50.0000000',
      largestAmount: '100.0000000',
    };

    const mockByAsset = [
      { asset: 'XLM', totalAmount: '150.0000000', tipCount: '3' },
      { asset: 'USDC', totalAmount: '100.0000000', tipCount: '2' },
    ];

    const mockTimeSeries = [
      {
        date: '2025-01-01T00:00:00.000Z',
        count: '2',
        totalAmount: '100.0000000',
        asset: 'XLM',
      },
      {
        date: '2025-01-02T00:00:00.000Z',
        count: '1',
        totalAmount: '50.0000000',
        asset: 'XLM',
      },
    ];

    const mockTopSupporters = [
      {
        walletAddress: 'GSUPPORTER1...',
        totalAmount: '150.0000000',
        tipCount: '3',
        lastTipAt: new Date('2025-01-02'),
      },
      {
        walletAddress: 'GSUPPORTER2...',
        totalAmount: '100.0000000',
        tipCount: '2',
        lastTipAt: new Date('2025-01-01'),
      },
    ];

    const setupAnalyticsMocks = (): void => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      let callCount = 0;
      mockTipsRepository.createQueryBuilder.mockImplementation(() => {
        const call = callCount++;
        return {
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          addGroupBy: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          getRawOne:
            call === 0
              ? jest.fn().mockResolvedValue(mockSummary)
              : jest.fn().mockResolvedValue(null),
          getRawMany:
            call === 1
              ? jest.fn().mockResolvedValue(mockByAsset)
              : call === 2
                ? jest.fn().mockResolvedValue(mockTimeSeries)
                : call === 3
                  ? jest.fn().mockResolvedValue(mockTopSupporters)
                  : jest.fn().mockResolvedValue([]),
        };
      });
    };

    it('should return analytics with summary, byAsset, timeSeries, and topSupporters', async () => {
      setupAnalyticsMocks();

      const result = await service.getAnalytics('user-1', '30d');

      expect(result.summary.totalTipsReceived).toBe(5);
      expect(result.summary.totalAmountReceived).toBe(250);
      expect(result.summary.averageTipAmount).toBe(50);
      expect(result.summary.largestTipAmount).toBe(100);
      expect(result.byAsset).toHaveLength(2);
      expect(result.timeSeries).toHaveLength(2);
      expect(result.topSupporters).toHaveLength(2);
      expect(result.period).toBe('30d');
      expect(result.generatedAt).toBeDefined();
    });

    it('should filter by asset when specified', async () => {
      setupAnalyticsMocks();

      const result = await service.getAnalytics('user-1', '30d', 'XLM');
      expect(result.period).toBe('30d');
    });

    it('should throw on missing user', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.getAnalytics('invalid-user', '30d')).rejects.toThrow(
        'User not found',
      );
    });

    it('should handle all-time period', async () => {
      setupAnalyticsMocks();

      const result = await service.getAnalytics('user-1', 'all');
      expect(result.period).toBe('all');
    });
  });
});
