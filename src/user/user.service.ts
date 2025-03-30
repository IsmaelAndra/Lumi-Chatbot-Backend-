import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Like, Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    return this.userRepository.findOne({ where: { phoneNumber } });
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async updateUser(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find();
  }

  async getUsersForFollowUp(currentTime?: string): Promise<User[]> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.wantsSupport = :wantsSupport', { wantsSupport: true });

    if (currentTime) {
      queryBuilder.andWhere('user.followUpTime = :time', { time: currentTime });
    }

    return queryBuilder.getMany();
  }

  async getUsersWithLowEmotionalScale(threshold: number = 5): Promise<User[]> {
    return this.userRepository.find({
      where: {
        emotionalScale: LessThan(threshold),
        wantsSupport: true,
      },
      order: { emotionalScale: 'ASC' },
    });
  }

  async getAllUsersWithEmotions(): Promise<User[]> {
    return this.userRepository.find({
      relations: ['emotionalScales'],
      order: { lastInteraction: 'DESC' },
      take: 100, // Limitar resultados para evitar sobrecarga
    });
  }

  async searchUsers(phone: string): Promise<User[]> {
    if (!phone) {
      return [];
    }

    return this.userRepository.find({
      where: {
        phoneNumber: Like(`%${phone}%`),
      },
      relations: ['emotionalScales'],
      take: 20,
    });
  }

  async getUserEmotionHistory(phone: string) {
    const user = await this.userRepository.findOne({
      where: { phoneNumber: phone },
      relations: ['emotionalScales'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user.emotionalScales.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }
}
