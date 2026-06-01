import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Horizon, Networks } from '@stellar/stellar-sdk';

@Injectable()
export class StellarService implements OnModuleInit {
  private readonly logger = new Logger(StellarService.name);
  private server: Horizon.Server;
  private network: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const serverUrl =
      this.configService.get<string>('STELLAR_NODE_URL') ||
      'https://horizon-testnet.stellar.org';
    this.network =
      this.configService.get<string>('STELLAR_NETWORK') || 'TESTNET';
    this.server = new Horizon.Server(serverUrl);
    this.logger.log(
      `Stellar SDK initialized — connected to ${this.network} at ${serverUrl}`,
    );
  }

  async verifyPayment(transactionHash: string): Promise<{
    verified: boolean;
    from?: string;
    to?: string;
    amount?: number;
    asset?: string;
  }> {
    try {
      const tx = await this.server
        .transactions()
        .transaction(transactionHash)
        .call();

      if (!tx) {
        return { verified: false };
      }

      const operation = (tx as any).operations?.[0];
      const from = (tx as any).source_account || '';
      let to = '';
      let amount = 0;
      let asset = 'XLM';

      if (operation) {
        to = (operation as any).to || (operation as any).destination || '';
        amount = parseFloat(
          (operation as any).amount || (operation as any).starting_balance || '0',
        );
        if ((operation as any).asset_type === 'credit_alphanum4') {
          asset = `${(operation as any).asset_code}:${(operation as any).asset_issuer}`;
        }
      }

      return {
        verified: true,
        from,
        to,
        amount,
        asset,
      };
    } catch (error) {
      this.logger.error(
        `Failed to verify transaction ${transactionHash}: ${error.message}`,
      );
      return { verified: false };
    }
  }

  async getAccountBalance(walletAddress: string): Promise<{
    balances: Array<{ asset: string; balance: string }>;
  }> {
    try {
      const account = await this.server.loadAccount(walletAddress);
      const balances = account.balances.map((b: any) => ({
        asset:
          b.asset_type === 'native'
            ? 'XLM'
            : `${b.asset_code}:${b.asset_issuer}`,
        balance: b.balance,
      }));

      return { balances };
    } catch (error) {
      this.logger.error(
        `Failed to fetch balance for ${walletAddress}: ${error.message}`,
      );
      return { balances: [] };
    }
  }

  async getAccountInfo(walletAddress: string) {
    try {
      const account = await this.server.loadAccount(walletAddress);
      return {
        address: walletAddress,
        exists: true,
        sequenceNumber: account.sequenceNumber,
        subentryCount: (account as any).subentry_count || 0,
        network: this.network,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch account info for ${walletAddress}: ${error.message}`,
      );
      return {
        address: walletAddress,
        exists: false,
        sequenceNumber: null,
        subentryCount: 0,
        network: this.network,
      };
    }
  }
}
