import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginStellarDto {
  @ApiProperty({ description: 'Stellar wallet public key (G...)' })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @ApiProperty({ description: 'Signed message for verification' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: 'Base64-encoded Stellar signature' })
  @IsString()
  @IsNotEmpty()
  signature: string;
}
