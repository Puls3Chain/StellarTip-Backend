import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { SkipApiThrottle } from '../config/throttle.config';

@ApiTags('health')
@Controller('health')
@SkipApiThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: 'Basic health check' })
  @Get()
  getHealth(): {
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
  } {
    return this.healthService.getHealth();
  }

  @ApiOperation({ summary: 'Readiness probe (checks database)' })
  @Get('ready')
  async getReady(@Res() res: Response): Promise<Response> {
    const result = await this.healthService.getReadiness();
    const statusCode =
      result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(statusCode).json(result);
  }

  @ApiOperation({ summary: 'Remote health check (checks Stellar Horizon)' })
  @Get('remote')
  async getRemote(@Res() res: Response): Promise<Response> {
    const result = await this.healthService.getRemoteHealth();
    const statusCode =
      result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(statusCode).json(result);
  }
}
