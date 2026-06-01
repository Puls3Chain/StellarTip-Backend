import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateSocialLinksDto } from './dto/update-social-links.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get(':username/tipping-info')
  async getTippingInfo(@Param('username') username: string) {
    return this.profilesService.getTippingInfo(username);
  }

  @Get(':username')
  async getProfile(@Param('username') username: string) {
    return this.profilesService.getProfile(username);
  }

  @Get()
  async searchProfiles(@Query('q') query: string) {
    if (!query) {
      return [];
    }
    return this.profilesService.searchProfiles(query);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateProfile(@Request() req, @Body() updateDto: CreateProfileDto) {
    return this.profilesService.updateProfile(req.user.id, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/social-links')
  async updateSocialLinks(
    @Request() req,
    @Body() socialLinksDto: UpdateSocialLinksDto,
  ) {
    return this.profilesService.updateSocialLinks(req.user.id, socialLinksDto);
  }
}
