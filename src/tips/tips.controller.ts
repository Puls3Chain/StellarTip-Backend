import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TipsService, TipFilterOptions } from './tips.service';
import { CreateTipDto } from './dto/create-tip.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TipCreationThrottle } from '../config/throttle.config';

@Controller('tips')
export class TipsController {
  constructor(private readonly tipsService: TipsService) {}

  @Post()
  @TipCreationThrottle()
  async createTip(@Body() createTipDto: CreateTipDto) {
    if (!createTipDto.senderWallet && !createTipDto.transactionHash) {
      throw new Error('senderWallet is required when no transactionHash is provided');
    }
    return this.tipsService.createTip(createTipDto);
  }

  @Get(':id')
  async getTip(@Param('id') id: string) {
    return this.tipsService.getTipById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/received')
  async getMyReceivedTips(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('asset') asset?: string,
    @Query('minAmount') minAmount?: number,
    @Query('maxAmount') maxAmount?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const filterOptions: TipFilterOptions = {
      page: +page,
      limit: +limit,
      startDate,
      endDate,
      asset,
      minAmount: minAmount ? +minAmount : undefined,
      maxAmount: maxAmount ? +maxAmount : undefined,
      sortBy,
      sortOrder,
    };
    return this.tipsService.getTipsByCreator(req.user.id, filterOptions);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/sent')
  async getMySentTips(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('asset') asset?: string,
    @Query('minAmount') minAmount?: number,
    @Query('maxAmount') maxAmount?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const filterOptions: TipFilterOptions = {
      page: +page,
      limit: +limit,
      startDate,
      endDate,
      asset,
      minAmount: minAmount ? +minAmount : undefined,
      maxAmount: maxAmount ? +maxAmount : undefined,
      sortBy,
      sortOrder,
    };
    return this.tipsService.getTipsBySupporter(req.user.id, filterOptions);
  }

  @Get('wallet/:walletAddress')
  async getTipsByWallet(
    @Param('walletAddress') walletAddress: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('asset') asset?: string,
    @Query('minAmount') minAmount?: number,
    @Query('maxAmount') maxAmount?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const filterOptions: TipFilterOptions = {
      page: +page,
      limit: +limit,
      startDate,
      endDate,
      asset,
      minAmount: minAmount ? +minAmount : undefined,
      maxAmount: maxAmount ? +maxAmount : undefined,
      sortBy,
      sortOrder,
    };
    return this.tipsService.getTipsByWallet(walletAddress, filterOptions);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/stats')
  async getMyStats(@Request() req) {
    return this.tipsService.getTipStats(req.user.id);
  }

  @Post(':id/confirm')
  @TipCreationThrottle()
  async confirmTip(
    @Param('id') id: string,
    @Body('transactionHash') transactionHash: string,
  ) {
    return this.tipsService.confirmTip(id, transactionHash);
  }
}
