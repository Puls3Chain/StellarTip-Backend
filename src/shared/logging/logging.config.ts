import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

const REDACTED = '***REDACTED***';

const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'authorization',
  'privateKey',
]);

function redactSensitive(
  obj: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> {
  if (depth > 5) return obj;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key)) {
      result[key] = REDACTED;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactSensitive(
        value as Record<string, unknown>,
        depth + 1,
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}

const isProduction = process.env.NODE_ENV === 'production';

const colorizeFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.colorize(),
  winston.format.printf(
    // winston callback params are typed as unknown; String() wrapping is safe here
    /* eslint-disable @typescript-eslint/no-base-to-string */
    ({ timestamp, level, message, context, requestId, duration, ...meta }) => {
      const ctx = context ? '[' + String(context) + ']' : '';
      const rid = requestId ? '[' + String(requestId) + ']' : '';
      const dur = duration ? ' ' + String(duration) + 'ms' : '';
      const metaStr = Object.keys(meta as Record<string, unknown>).length
        ? ' ' + JSON.stringify(meta)
        : '';
      return (
        String(timestamp) +
        ' ' +
        String(level) +
        ' ' +
        ctx +
        rid +
        ' ' +
        String(message) +
        dur +
        metaStr
      );
      /* eslint-enable @typescript-eslint/no-base-to-string */
    },
  ),
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format((info) => {
    if (info.meta && typeof info.meta === 'object') {
      info.meta = redactSensitive(info.meta as Record<string, unknown>);
    }
    return info;
  })(),
  winston.format.json(),
);

export const winstonConfig = {
  level: isProduction ? 'info' : 'debug',
  format: isProduction ? jsonFormat : colorizeFormat,
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
};

@Injectable()
export class StructuredLogger implements LoggerService {
  private readonly logger = winston.createLogger(winstonConfig);

  private formatMeta(
    context?: string,
    meta?: Record<string, unknown>,
  ): Record<string, unknown> {
    const formatted: Record<string, unknown> = {};
    if (context) formatted.context = context;
    if (meta) Object.assign(formatted, redactSensitive(meta));
    return formatted;
  }

  log(message: string, context?: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, this.formatMeta(context, meta));
  }

  error(
    message: string,
    trace?: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    const formatted = this.formatMeta(context, meta);
    if (trace) formatted.trace = trace;
    this.logger.error(message, formatted);
  }

  warn(
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    this.logger.warn(message, this.formatMeta(context, meta));
  }

  debug(
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    this.logger.debug(message, this.formatMeta(context, meta));
  }

  verbose(
    message: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    this.logger.verbose(message, this.formatMeta(context, meta));
  }
}
