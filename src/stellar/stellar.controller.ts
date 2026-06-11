import {
  Controller,
  Get,
  Query,
  Logger,
  HttpException,
  HttpStatus,
  Post,
  Body,
} from '@nestjs/common';
import { StellarService } from './stellar.service';

@Controller('stellar')
export class StellarController {
  private readonly logger = new Logger(StellarController.name);

  constructor(private readonly stellarService: StellarService) {}

  @Get('balance')
  async getBalance(
    @Query('walletAddress') walletAddress: string,
  ): Promise<{ balances: Array<{ asset: string; balance: string }> }> {
    if (!walletAddress) {
      throw new HttpException(
        'walletAddress is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.stellarService.getAccountBalance(walletAddress);
  }

  @Get('account')
  async getAccount(@Query('walletAddress') walletAddress: string): Promise<{
    address: string;
    exists: boolean;
    sequenceNumber: string | null;
    subentryCount: number;
    network: string;
  }> {
    if (!walletAddress) {
      throw new HttpException(
        'walletAddress is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.stellarService.getAccountInfo(walletAddress);
  }

  @Post('verify-payment')
  async verifyPayment(
    @Body('transactionHash') transactionHash: string,
  ): Promise<{
    verified: boolean;
    from?: string;
    to?: string;
    amount?: number;
    asset?: string;
  }> {
    if (!transactionHash) {
      throw new HttpException(
        'transactionHash is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.stellarService.verifyPayment(transactionHash);
  }
}
