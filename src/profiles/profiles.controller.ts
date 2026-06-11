import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateSocialLinksDto } from './dto/update-social-links.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../entities/user.entity';

@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get(':username/tipping-info')
  async getTippingInfo(
    @Param('username') username: string,
  ): Promise<Record<string, unknown>> {
    return this.profilesService.getTippingInfo(username);
  }

  @Get(':username')
  async getProfile(@Param('username') username: string): Promise<User | null> {
    return this.profilesService.getProfile(username);
  }

  @Get()
  async searchProfiles(@Query('q') query: string): Promise<User[]> {
    if (!query) {
      return [];
    }
    return this.profilesService.searchProfiles(query);
  }

  @ApiOperation({ summary: 'Get creator analytics dashboard (cached 5 min)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(CacheInterceptor)
  @Get('me/analytics')
  async getAnalytics(
    @Req() req: Request,
    @Query('period') period?: string,
    @Query('asset') asset?: string,
  ): Promise<Record<string, unknown>> {
    return this.profilesService.getAnalytics(req.user!.id, period, asset);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateProfile(
    @Req() req: Request,
    @Body() updateDto: CreateProfileDto,
  ): Promise<User> {
    return this.profilesService.updateProfile(req.user!.id, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/social-links')
  async updateSocialLinks(
    @Req() req: Request,
    @Body() socialLinksDto: UpdateSocialLinksDto,
  ): Promise<User> {
    return this.profilesService.updateSocialLinks(req.user!.id, socialLinksDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @Req() req: Request,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /(image\/jpeg|image\/png|image\/webp)$/,
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: {
      mimetype: string;
      size: number;
      originalname: string;
      buffer: Buffer;
    },
  ): Promise<{ avatarUrl: string }> {
    const userId = req.user!.id;
    const avatarUrl = await this.profilesService.uploadAvatar(userId, file);
    return { avatarUrl };
  }
}
