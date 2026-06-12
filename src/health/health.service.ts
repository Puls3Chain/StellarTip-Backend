import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StellarService } from '../stellar/stellar.service';
import { StructuredLogger } from '../shared/logging/logging.config';

@Injectable()
export class HealthService {
  private readonly logger = new StructuredLogger();
  private readonly startTime = Date.now();

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly stellarService: StellarService,
  ) {}

  getHealth(): {
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
  } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '0.1.0',
    };
  }

  async getReadiness(): Promise<{
    status: string;
    database: string;
    timestamp: string;
    message?: string;
  }> {
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Database health check failed: ' + message,
        undefined,
        'HealthService',
      );
      return {
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        message: 'Database connection failed',
      };
    }
  }

  async getRemoteHealth(): Promise<{
    status: string;
    stellar: string;
    stellarNetwork?: string;
    timestamp: string;
    message?: string;
  }> {
    try {
      // Check Stellar Horizon connectivity by verifying a known transaction hash
      // Using a basic connectivity check: attempt to fetch the first ledger
      const account = await this.stellarService.getAccountInfo(
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      );

      return {
        status: 'ok',
        stellar: account.exists ? 'reachable' : 'degraded',
        stellarNetwork: account.network,
        timestamp: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Stellar health check failed: ' + message,
        undefined,
        'HealthService',
      );
      return {
        status: 'error',
        stellar: 'unreachable',
        timestamp: new Date().toISOString(),
        message: 'Unable to connect to Stellar Horizon',
      };
    }
  }
}
