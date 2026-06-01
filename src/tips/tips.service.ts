import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Tip, TipStatus, TipAsset } from '../entities/tip.entity';
import { User } from '../entities/user.entity';
import { CreateTipDto } from './dto/create-tip.dto';

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
    this.usdcIssuer =
      this.configService.get<string>('USDC_ISSUER') || null;
  }

  async createTip(createTipDto: CreateTipDto, supporterId?: string) {
    const {
      receiverWallet,
      senderWallet,
      amount,
      message,
      asset,
      assetIssuer,
      transactionHash,
    } = createTipDto;

    // Find creator by wallet address
    const creator = await this.usersRepository.findOne({
      where: { walletAddress: receiverWallet },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found with this wallet address');
    }

    // Validate amount
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
      tipAsset === TipAsset.USDC
        ? assetIssuer || this.usdcIssuer
        : null;
    tip.message = message || '';
    tip.transactionHash = transactionHash || '';
    tip.status = transactionHash ? TipStatus.COMPLETED : TipStatus.PENDING;

    return this.tipsRepository.save(tip);
  }

  async getTipById(id: string) {
    const tip = await this.tipsRepository.findOne({
      where: { id },
      relations: ['creator', 'supporter'],
    });

    if (!tip) {
      throw new NotFoundException('Tip not found');
    }

    return tip;
  }

  async getTipsByCreator(creatorId: string, page = 1, limit = 20) {
    const [tips, total] = await this.tipsRepository.findAndCount({
      where: { creatorId },
      relations: ['supporter'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: tips,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTipsBySupporter(supporterId: string, page = 1, limit = 20) {
    const [tips, total] = await this.tipsRepository.findAndCount({
      where: { supporterId },
      relations: ['creator'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: tips,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTipsByWallet(walletAddress: string, page = 1, limit = 20) {
    const [tips, total] = await this.tipsRepository.findAndCount({
      where: [
        { receiverWallet: walletAddress },
        { senderWallet: walletAddress },
      ],
      relations: ['creator', 'supporter'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: tips,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async confirmTip(id: string, transactionHash: string) {
    const tip = await this.tipsRepository.findOne({ where: { id } });
    if (!tip) {
      throw new NotFoundException('Tip not found');
    }

    tip.transactionHash = transactionHash;
    tip.status = TipStatus.COMPLETED;
    return this.tipsRepository.save(tip);
  }

  async getTipStats(creatorId: string) {
    const result = await this.tipsRepository
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

    return result;
  }
}
