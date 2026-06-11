import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Horizon } from '@stellar/stellar-sdk';

@Injectable()
export class StellarService implements OnModuleInit {
  private readonly logger = new Logger(StellarService.name);
  private server: Horizon.Server;
  private network: string;

  constructor(private configService: ConfigService) {}

  onModuleInit(): void {
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

      // Access SDK response fields with type assertion (external Stellar SDK)
      /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
      const txAny = tx as any;
      const operation = txAny.operations?.[0];
      const from: string = txAny.source_account || '';
      let to = '';
      let amount = 0;
      let asset = 'XLM';

      if (operation) {
        to = operation.to || operation.destination || '';
        amount = parseFloat(
          operation.amount || operation.starting_balance || '0',
        );
        if (operation.asset_type === 'credit_alphanum4') {
          asset = `${operation.asset_code}:${operation.asset_issuer}`;
        }
      }
      /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */

      return {
        verified: true,
        from,
        to,
        amount,
        asset,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to verify transaction ${transactionHash}: ${message}`,
      );
      return { verified: false };
    }
  }

  async getAccountBalance(walletAddress: string): Promise<{
    balances: Array<{ asset: string; balance: string }>;
  }> {
    try {
      const account = await this.server.loadAccount(walletAddress);
      const balances = account.balances.map((b) => {
        if (b.asset_type === 'native') {
          return { asset: 'XLM', balance: b.balance };
        }
        // Access credit/issuer fields with type assertion for Stellar SDK union type
        /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
        const credit = b as any;
        return {
          asset: `${credit.asset_code}:${credit.asset_issuer}`,
          balance: credit.balance,
        };
        /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
      });

      return { balances };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to fetch balance for ${walletAddress}: ${message}`,
      );
      return { balances: [] };
    }
  }

  async getAccountInfo(walletAddress: string): Promise<{
    address: string;
    exists: boolean;
    sequenceNumber: string | null;
    subentryCount: number;
    network: string;
  }> {
    try {
      const account = await this.server.loadAccount(walletAddress);
      // Access SDK response fields with type assertion (external Stellar SDK)
      /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
      const accountAny = account as any;
      return {
        address: walletAddress,
        exists: true,
        sequenceNumber: account.sequenceNumber(),
        subentryCount: accountAny.subentry_count || 0,
        /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
        network: this.network,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to fetch account info for ${walletAddress}: ${message}`,
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
