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
import { TipsService } from './tips.service';
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
  ) {
    return this.tipsService.getTipsByCreator(req.user.id, +page, +limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/sent')
  async getMySentTips(
    @Request() req,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.tipsService.getTipsBySupporter(req.user.id, +page, +limit);
  }

  @Get('wallet/:walletAddress')
  async getTipsByWallet(
    @Param('walletAddress') walletAddress: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.tipsService.getTipsByWallet(walletAddress, +page, +limit);
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
