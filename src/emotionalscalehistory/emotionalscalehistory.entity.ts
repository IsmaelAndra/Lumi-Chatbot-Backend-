import { User } from 'src/user/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity()
export class EmotionalScaleHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  scale: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @ManyToOne(() => User, (user) => user.emotionalScales)
  user: User;
}
