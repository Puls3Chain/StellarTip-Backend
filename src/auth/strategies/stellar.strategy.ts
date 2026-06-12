import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Keypair } from '@stellar/stellar-sdk';
import { AuthService } from '@auth/auth.service';
import { User } from '../../entities/user.entity';
import { StructuredLogger } from '../../shared/logging/logging.config';

@Injectable()
export class StellarStrategy extends PassportStrategy(Strategy, 'stellar') {
  private readonly logger = new StructuredLogger();

  constructor(private authService: AuthService) {
    super();
  }

  // req is typed as any because passport-custom strategy doesn't provide typed request
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
  async validate(req: any): Promise<User> {
    const { walletAddress, message, signature } = req.body as {
      walletAddress?: string;
      message?: string;
      signature?: string;
    };

    if (!walletAddress || !message || !signature) {
      throw new UnauthorizedException('Missing required fields');
    }

    // Verify the Stellar signature
    const isValid = await this.verifyStellarSignature(
      walletAddress,
      message,
      signature,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Find or create user
    return this.authService.validateStellarUser(walletAddress);
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
  }

  private verifyStellarSignature(
    address: string,
    message: string,
    signature: string,
  ): Promise<boolean> {
    try {
      if (!signature || typeof signature !== 'string') {
        return Promise.resolve(false);
      }

      const keypair = Keypair.fromPublicKey(address);
      return Promise.resolve(
        keypair.verify(Buffer.from(message), Buffer.from(signature, 'base64')),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Error verifying Stellar signature: ' + message,
        error instanceof Error ? error.stack : undefined,
        'StellarStrategy',
      );
      return Promise.resolve(false);
    }
  }
}
