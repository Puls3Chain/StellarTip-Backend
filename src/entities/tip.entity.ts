import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum TipStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum TipAsset {
  XLM = 'XLM',
  USDC = 'USDC',
}

@Entity('tips')
export class Tip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.receivedTips)
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column({ name: 'creator_id' })
  creatorId: string;

  @ManyToOne(() => User, (user) => user.sentTips, { nullable: true })
  @JoinColumn({ name: 'supporter_id' })
  supporter: User | null;

  @Column({ name: 'supporter_id', nullable: true })
  supporterId: string | null;

  @Column({ name: 'sender_wallet' })
  senderWallet: string;

  @Column({ name: 'receiver_wallet' })
  receiverWallet: string;

  @Column('decimal', { precision: 20, scale: 7 })
  amount: number;

  @Column({
    type: 'enum',
    enum: TipAsset,
    default: TipAsset.XLM,
  })
  asset: TipAsset;

  @Column({ name: 'asset_issuer', nullable: true })
  assetIssuer: string | null;

  @Column({ nullable: true })
  message: string;

  @Column({ unique: true, nullable: true })
  transactionHash: string;

  @Column({
    type: 'enum',
    enum: TipStatus,
    default: TipStatus.PENDING,
  })
  status: TipStatus;

  @CreateDateColumn()
  createdAt: Date;
}
