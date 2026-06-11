import { applyDecorators } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

export const THROTTLER_SKIP = 'throttler:skip';

/**
 * Auth endpoints: 10 requests per 60 seconds per IP
 */
export const AuthThrottle = (): ClassDecorator & MethodDecorator =>
  applyDecorators(Throttle({ default: { ttl: 60000, limit: 10 } }));

/**
 * Tip creation endpoints: 30 requests per 60 seconds per IP
 */
export const TipCreationThrottle = (): ClassDecorator & MethodDecorator =>
  applyDecorators(Throttle({ default: { ttl: 60000, limit: 30 } }));

/**
 * Health check endpoints: not rate-limited
 */
export const SkipApiThrottle = (): ClassDecorator & MethodDecorator =>
  applyDecorators(SkipThrottle());
