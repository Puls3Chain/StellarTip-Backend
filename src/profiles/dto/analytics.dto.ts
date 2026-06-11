import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum AnalyticsPeriod {
  WEEK = '7d',
  MONTH = '30d',
  QUARTER = '90d',
  YEAR = '365d',
  ALL = 'all',
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Time period for analytics',
    enum: AnalyticsPeriod,
    default: AnalyticsPeriod.MONTH,
  })
  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod = AnalyticsPeriod.MONTH;

  @ApiPropertyOptional({
    description: 'Filter by asset type (XLM or USDC)',
  })
  @IsOptional()
  @IsString()
  asset?: string;
}

export class TimeSeriesPoint {
  date: string;
  count: number;
  totalAmount: number;
  asset: string;
}

export class SupporterInfo {
  walletAddress: string;
  totalAmount: number;
  tipCount: number;
  lastTipAt: Date | null;
}

export class AnalyticsResponseDto {
  summary: {
    totalTipsReceived: number;
    totalAmountReceived: number;
    averageTipAmount: number;
    largestTipAmount: number;
  };
  byAsset: Array<{
    asset: string;
    totalAmount: number;
    tipCount: number;
  }>;
  timeSeries: TimeSeriesPoint[];
  topSupporters: SupporterInfo[];
  period: string;
  generatedAt: string;
}
