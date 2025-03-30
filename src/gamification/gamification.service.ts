import { Injectable } from '@nestjs/common';
import { User } from 'src/user/user.entity';
import { UserService } from 'src/user/user.service';

@Injectable()
export class GamificationService {
  private readonly ACHIEVEMENTS = [
    {
      id: '7d_positive',
      name: 'Racha Positiva 🏅',
      condition: (user: User) => user.positiveEmotionStreak >= 7,
    },
    {
      id: '100_points',
      name: 'Centenaria ✨',
      condition: (user: User) => user.points >= 100,
    },
    {
      id: 'meditation_master',
      name: 'Maestro Zen 🧘',
      condition: (user: User) =>
        user.resourcesUsed?.filter(
          (r) => r.type === 'video' && r.query.includes('meditación'),
        ).length >= 5,
    },
  ];

  constructor(private userService: UserService) {}

  async checkAchievements(user: User): Promise<string[]> {
    const unlocked = this.ACHIEVEMENTS.filter(
      (ach) =>
        !user.unlockedAchievements?.includes(ach.id) && ach.condition(user),
    );

    if (unlocked.length > 0) {
      await this.userService.updateUser({
        ...user,
        unlockedAchievements: [
          ...(user.unlockedAchievements || []),
          ...unlocked.map((ach) => ach.id),
        ],
      });
    }
    return unlocked.map((ach) => ach.name);
  }

  async addPoints(user: User, points: number): Promise<void> {
    await this.userService.updateUser({
      ...user,
      points: user.points + points,
    });
  }
}
