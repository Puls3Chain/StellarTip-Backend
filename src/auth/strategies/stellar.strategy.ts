import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Keypair } from '@stellar/stellar-sdk';
import { AuthService } from '@auth/auth.service';

@Injectable()
export class StellarStrategy extends PassportStrategy(Strategy, 'stellar') {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(req: any) {
    const { walletAddress, message, signature } = req.body;

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
    } catch (error) {
      console.error('Error verifying Stellar signature:', error);
      return Promise.resolve(false);
    }
  }
}
