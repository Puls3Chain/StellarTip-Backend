import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Tip, TipStatus, TipAsset } from '../entities/tip.entity';
import { User } from '../entities/user.entity';
import { CreateTipDto } from './dto/create-tip.dto';

export interface TipFilterOptions {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  asset?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

const ALLOWED_SORT_BY = ['createdAt', 'amount'];
const ALLOWED_SORT_ORDER = ['ASC', 'DESC'];

@Injectable()
export class TipsService {
  private readonly usdcIssuer: string | null;

  constructor(
    @InjectRepository(Tip)
    private tipsRepository: Repository<Tip>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService,
  ) {
    this.usdcIssuer = this.configService.get<string>('USDC_ISSUER') || null;
  }

  private buildFilterQuery(filterOptions: TipFilterOptions): {
    where: Record<string, unknown>;
    order: Record<string, string>;
    skip: number;
    take: number;
  } {
    const page = filterOptions.page || 1;
    const limit = filterOptions.limit || 20;

    if (page < 1) throw new BadRequestException('Page must be greater than 0');
    if (limit < 1 || limit > 100)
      throw new BadRequestException('Limit must be between 1 and 100');

    const sortBy = filterOptions.sortBy || 'createdAt';
    const sortOrder = filterOptions.sortOrder || 'DESC';

    if (!ALLOWED_SORT_BY.includes(sortBy)) {
      throw new BadRequestException(
        `Invalid sortBy: ${sortBy}. Allowed values: ${ALLOWED_SORT_BY.join(', ')}`,
      );
    }
    if (!ALLOWED_SORT_ORDER.includes(sortOrder)) {
      throw new BadRequestException(
        `Invalid sortOrder: ${sortOrder}. Allowed values: ${ALLOWED_SORT_ORDER.join(', ')}`,
      );
    }

    const query: Record<string, unknown> = {};

    // Date range filters
    if (filterOptions.startDate && filterOptions.endDate) {
      const startDate = new Date(filterOptions.startDate);
      const endDate = new Date(filterOptions.endDate);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid date format. Use ISO 8601.');
      }
      query.createdAt = Between(startDate, endDate);
    } else if (filterOptions.startDate) {
      const startDate = new Date(filterOptions.startDate);
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException(
          'Invalid startDate format. Use ISO 8601.',
        );
      }
      query.createdAt = MoreThanOrEqual(startDate);
    } else if (filterOptions.endDate) {
      const endDate = new Date(filterOptions.endDate);
      if (isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid endDate format. Use ISO 8601.');
      }
      query.createdAt = LessThanOrEqual(endDate);
    }

    // Asset filter
    if (filterOptions.asset) {
      const normalizedAsset = filterOptions.asset.toUpperCase();
      if (!Object.values(TipAsset).includes(normalizedAsset as TipAsset)) {
        throw new BadRequestException(
          `Invalid asset: ${filterOptions.asset}. Supported: ${Object.values(TipAsset).join(', ')}`,
        );
      }
      query.asset = normalizedAsset;
    }

    // Amount range filters
    if (
      filterOptions.minAmount !== undefined &&
      filterOptions.maxAmount !== undefined
    ) {
      if (filterOptions.minAmount < 0 || filterOptions.maxAmount < 0) {
        throw new BadRequestException(
          'Amount filters must be greater than or equal to 0',
        );
      }
      query.amount = Between(filterOptions.minAmount, filterOptions.maxAmount);
    } else if (filterOptions.minAmount !== undefined) {
      if (filterOptions.minAmount < 0) {
        throw new BadRequestException(
          'minAmount must be greater than or equal to 0',
        );
      }
      query.amount = MoreThanOrEqual(filterOptions.minAmount);
    } else if (filterOptions.maxAmount !== undefined) {
      if (filterOptions.maxAmount < 0) {
        throw new BadRequestException(
          'maxAmount must be greater than or equal to 0',
        );
      }
      query.amount = LessThanOrEqual(filterOptions.maxAmount);
    }

    const order: Record<string, string> = {};
    order[sortBy] = sortOrder;

    return {
      where: query,
      order,
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  private formatPaginatedResult(
    tips: Tip[],
    total: number,
    page: number,
    limit: number,
  ): {
    data: Tip[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } {
    const totalPages = Math.ceil(total / limit);
    return {
      data: tips,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  async createTip(
    createTipDto: CreateTipDto,
    supporterId?: string,
  ): Promise<Tip> {
    const {
      receiverWallet,
      senderWallet,
      amount,
      message,
      asset,
      assetIssuer,
      transactionHash,
    } = createTipDto;

    const creator = await this.usersRepository.findOne({
      where: { walletAddress: receiverWallet },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found with this wallet address');
    }

    if (amount <= 0) {
      throw new BadRequestException('Tip amount must be greater than 0');
    }

    const tipAsset = (asset as TipAsset) || TipAsset.XLM;

    // Validate and process USDC asset
    if (tipAsset === TipAsset.USDC) {
      if (!this.usdcIssuer) {
        throw new BadRequestException(
          'USDC tipping is not configured. Please set the USDC_ISSUER environment variable.',
        );
      }
    }

    // Validate unsupported asset types
    if (!Object.values(TipAsset).includes(tipAsset)) {
      throw new BadRequestException(
        `Unsupported asset type: ${asset}. Supported asset types are: ${Object.values(TipAsset).join(', ')}`,
      );
    }

    const tip = new Tip();
    tip.creator = creator;
    tip.supporterId = supporterId || null;
    tip.senderWallet = senderWallet || '';
    tip.receiverWallet = receiverWallet;
    tip.amount = amount;
    tip.asset = tipAsset;
    tip.assetIssuer =
      tipAsset === TipAsset.USDC ? assetIssuer || this.usdcIssuer : null;
    tip.message = message || '';
    tip.transactionHash = transactionHash || '';
    tip.status = transactionHash ? TipStatus.COMPLETED : TipStatus.PENDING;

    return this.tipsRepository.save(tip);
  }

  async getTipById(id: string): Promise<Tip> {
    const tip = await this.tipsRepository.findOne({
      where: { id },
      relations: ['creator', 'supporter'],
    });

    if (!tip) {
      throw new NotFoundException('Tip not found');
    }

    return tip;
  }

  async getTipsByCreator(
    creatorId: string,
    filterOptions: TipFilterOptions = {},
  ): Promise<{
    data: Tip[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }> {
    const baseQuery = { creatorId };
    const { where, order, skip, take } = this.buildFilterQuery(filterOptions);

    const finalWhere = { ...baseQuery, ...where };

    // TypeORM findAndCount accepts broad where shapes
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
    const [tips, total] = await this.tipsRepository.findAndCount({
      where: finalWhere as any,
      relations: ['supporter'],
      order: order,
      skip,
      take,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */

    return this.formatPaginatedResult(
      tips,
      total,
      filterOptions.page || 1,
      filterOptions.limit || 20,
    );
  }

  async getTipsBySupporter(
    supporterId: string,
    filterOptions: TipFilterOptions = {},
  ): Promise<{
    data: Tip[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }> {
    const { where, order, skip, take } = this.buildFilterQuery(filterOptions);
    const finalWhere = { supporterId, ...where };

    // TypeORM findAndCount accepts broad where shapes
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
    const [tips, total] = await this.tipsRepository.findAndCount({
      where: finalWhere as any,
      relations: ['creator'],
      order: order,
      skip,
      take,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */

    return this.formatPaginatedResult(
      tips,
      total,
      filterOptions.page || 1,
      filterOptions.limit || 20,
    );
  }

  async getTipsByWallet(
    walletAddress: string,
    filterOptions: TipFilterOptions = {},
  ): Promise<{
    data: Tip[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }> {
    const {
      where: filterWhere,
      order,
      skip,
      take,
    } = this.buildFilterQuery(filterOptions);

    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
    const where: any[] = [
      {
        receiverWallet: walletAddress,
        ...filterWhere,
      },
      {
        senderWallet: walletAddress,
        ...filterWhere,
      },
    ];

    const [tips, total] = await this.tipsRepository.findAndCount({
      where: where as any,
      relations: ['creator', 'supporter'],
      order: order,
      skip,
      take,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */

    return this.formatPaginatedResult(
      tips,
      total,
      filterOptions.page || 1,
      filterOptions.limit || 20,
    );
  }

  async confirmTip(id: string, transactionHash: string): Promise<Tip> {
    const tip = await this.tipsRepository.findOne({ where: { id } });
    if (!tip) {
      throw new NotFoundException('Tip not found');
    }

    tip.transactionHash = transactionHash;
    tip.status = TipStatus.COMPLETED;
    return this.tipsRepository.save(tip);
  }

  async getTipStats(creatorId: string): Promise<
    Array<{
      totalAmount: string;
      totalTips: string;
      asset: string;
      assetIssuer: string | null;
    }>
  > {
    // getRawMany() returns any from TypeORM; mapped to typed array

    const result: Array<Record<string, unknown>> = await this.tipsRepository
      .createQueryBuilder('tip')
      .select('COALESCE(SUM(tip.amount), 0)', 'totalAmount')
      .addSelect('COUNT(tip.id)', 'totalTips')
      .addSelect('tip.asset', 'asset')
      .addSelect('tip.assetIssuer', 'assetIssuer')
      .where('tip.creatorId = :creatorId', { creatorId })
      .andWhere('tip.status = :status', { status: TipStatus.COMPLETED })
      .groupBy('tip.asset')
      .addGroupBy('tip.assetIssuer')
      .getRawMany();

    return result.map((row) => {
      /* eslint-disable @typescript-eslint/no-base-to-string */
      const mapped = {
        totalAmount: String(row.totalAmount ?? '0'),
        totalTips: String(row.totalTips ?? '0'),
        asset: String(row.asset ?? 'XLM'),
        assetIssuer: row.assetIssuer ? String(row.assetIssuer) : null,
      };
      /* eslint-enable @typescript-eslint/no-base-to-string */
      return mapped;
    });
  }
}
