import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
} from '../entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) {}

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: Record<string, any>,
  ): Promise<Notification> {
    const notification = new Notification();
    notification.userId = userId;
    notification.type = type;
    notification.title = title;
    notification.message = message;
    notification.metadata = metadata || null;

    return this.notificationsRepository.save(notification);
  }

  async getNotifications(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: Notification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }> {
    const [notifications, total] =
      await this.notificationsRepository.findAndCount({
        where: { userId },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      data: notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    };
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    return this.notificationsRepository.save(notification);
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const count = await this.notificationsRepository.count({
      where: { userId, isRead: false },
    });

    return { unreadCount: count };
  }

  async notifyTipReceived(
    creatorId: string,
    senderWallet: string,
    amount: number,
    asset: string,
  ): Promise<Notification> {
    return this.createNotification(
      creatorId,
      NotificationType.TIP_RECEIVED,
      'Tip Received',
      `You received a tip of ${amount} ${asset}`,
      { senderWallet, amount, asset },
    );
  }
}
