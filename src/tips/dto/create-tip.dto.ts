import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateTipDto {
  @IsString()
  @IsNotEmpty()
  receiverWallet: string;

  @IsString()
  @IsOptional()
  senderWallet?: string;

  @IsNumber()
  @Min(0.0000001)
  amount: number;

  @IsString()
  @IsOptional()
  message?: string;

  @IsString()
  @IsOptional()
  asset?: string;

  @IsString()
  @IsOptional()
  assetIssuer?: string;

  @IsString()
  @IsOptional()
  transactionHash?: string;
}
