import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateSocialLinksDto {
  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['https'] })
  @MaxLength(200)
  twitter?: string;

  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['https'] })
  @MaxLength(200)
  github?: string;

  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['https'] })
  @MaxLength(200)
  youtube?: string;

  @IsOptional()
  @IsUrl({ require_tld: false, require_protocol: true, protocols: ['https'] })
  @MaxLength(200)
  website?: string;
}
