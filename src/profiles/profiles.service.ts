import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Tip, TipStatus } from '../entities/tip.entity';
import { CreateProfileDto } from './dto/create-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Tip)
    private tipsRepository: Repository<Tip>,
  ) {}

  async getProfile(username: string) {
    const user = await this.usersRepository.findOne({
      where: { username, isActive: true },
      select: [
        'id',
        'username',
        'displayName',
        'bio',
        'avatarUrl',
        'walletAddress',
        'socialLinks',
        'createdAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    return user;
  }

  async getProfileById(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id, isActive: true },
      select: [
        'id',
        'username',
        'displayName',
        'bio',
        'avatarUrl',
        'walletAddress',
        'createdAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    return user;
  }

  async getTippingInfo(username: string) {
    const user = await this.usersRepository.findOne({
      where: { username, isActive: true },
      select: [
        'id',
        'username',
        'displayName',
        'bio',
        'avatarUrl',
        'walletAddress',
        'createdAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('Profile not found');
    }

    // Get total tips received
    const statsResult = await this.tipsRepository
      .createQueryBuilder('tip')
      .select('COALESCE(SUM(tip.amount), 0)', 'totalAmount')
      .addSelect('COUNT(tip.id)', 'totalTips')
      .where('tip.receiverWallet = :wallet', { wallet: user.walletAddress })
      .andWhere('tip.status = :status', { status: TipStatus.COMPLETED })
      .getRawOne();

    // Get top supporter
    const topSupporter = await this.tipsRepository
      .createQueryBuilder('tip')
      .select('tip.senderWallet', 'walletAddress')
      .addSelect('SUM(tip.amount)', 'totalAmount')
      .addSelect('COUNT(tip.id)', 'tipCount')
      .where('tip.receiverWallet = :wallet', { wallet: user.walletAddress })
      .andWhere('tip.status = :status', { status: TipStatus.COMPLETED })
      .andWhere('tip.senderWallet IS NOT NULL')
      .andWhere("tip.senderWallet != ''")
      .groupBy('tip.senderWallet')
      .orderBy('SUM(tip.amount)', 'DESC')
      .limit(1)
      .getRawOne();

    // Get recent tip messages (last 5, anonymous)
    const recentTips = await this.tipsRepository.find({
      where: {
        receiverWallet: user.walletAddress,
        status: TipStatus.COMPLETED,
      },
      select: ['amount', 'asset', 'message', 'createdAt', 'senderWallet'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      displayName: user.displayName,
      username: user.username,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      walletAddress: user.walletAddress || null,
      stats: {
        totalTipsReceived: parseInt(statsResult?.totalTips || '0', 10),
        totalAmountReceived: parseFloat(statsResult?.totalAmount || '0'),
      },
      topSupporter: topSupporter
        ? {
            walletAddress: topSupporter.walletAddress,
            totalAmount: parseFloat(topSupporter.totalAmount || '0'),
            tipCount: parseInt(topSupporter.tipCount || '0', 10),
          }
        : null,
      recentMessages: recentTips.map((tip) => ({
        amount: tip.amount,
        asset: tip.asset,
        message: tip.message || null,
        createdAt: tip.createdAt,
      })),
    };
  }

  async updateProfile(userId: string, updateDto: CreateProfileDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateDto.displayName) {
      user.displayName = updateDto.displayName;
    }
    if (updateDto.bio !== undefined) {
      user.bio = updateDto.bio;
    }
    if (updateDto.avatarUrl !== undefined) {
      user.avatarUrl = updateDto.avatarUrl;
    }

    return this.usersRepository.save(user);
  }

  async updateWalletAddress(userId: string, walletAddress: string) {
    const existing = await this.usersRepository.findOne({
      where: { walletAddress },
    });
    if (existing && existing.id !== userId) {
      throw new ConflictException('Wallet address already linked to another account');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.walletAddress = walletAddress;
    return this.usersRepository.save(user);
  }

  async updateSocialLinks(userId: string, socialLinks: { twitter?: string; github?: string; youtube?: string; website?: string }) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.socialLinks = {
      ...(user.socialLinks || {}),
      ...socialLinks,
    };

    await this.usersRepository.save(user);
    return user.socialLinks;
  }

  async searchProfiles(query: string) {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.isActive = :active', { active: true })
      .andWhere(
        '(user.username ILIKE :query OR user.displayName ILIKE :query)',
        { query: `%${query}%` },
      )
      .select([
        'user.id',
        'user.username',
        'user.displayName',
        'user.bio',
        'user.avatarUrl',
      ])
      .take(20)
      .getMany();
  }
}
