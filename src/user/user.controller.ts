import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Get(':phoneNumber')
  async getUser(@Param('phoneNumber') phoneNumber: string) {
    return this.userService.findByPhoneNumber(phoneNumber);
  }

  @Patch(':phoneNumber')
  async updateUser(
    @Param('phoneNumber') phoneNumber: string,
    @Body() updates: Partial<User>,
  ) {
    return this.userService.updateUser({ phoneNumber, ...updates });
  }

  @Get('follow-ups/active')
  async getUsersInFollowUp() {
    return this.userService.getUsersForFollowUp();
  }

  @Get('all-with-emotions')
  async getAllUsersWithEmotions() {
    try {
      const users = await this.userService.getAllUsersWithEmotions();
      if (!users || users.length === 0) {
        throw new HttpException('No users found', HttpStatus.NOT_FOUND);
      }
      return {
        status: 'success',
        data: users,
        count: users.length,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 'error',
          message: error.message || 'Failed to fetch users',
          timestamp: new Date(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('search')
  async searchUsers(@Query('phone') phone: string) {
    if (!phone || phone.length < 3) {
      throw new HttpException(
        'Phone number must be at least 3 characters',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const users = await this.userService.searchUsers(phone);
      return {
        status: 'success',
        data: users,
        count: users.length,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        {
          status: 'error',
          message: error.message || 'Search failed',
          timestamp: new Date(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':phone/emotion-history')
  async getEmotionHistory(@Param('phone') phone: string) {
    return this.userService.getUserEmotionHistory(phone);
  }
}
