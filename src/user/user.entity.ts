import {
  Entity,
  PrimaryColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EmotionalScaleHistory } from 'src/emotionalscalehistory/emotionalscalehistory.entity';

@Entity()
export class User {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  phoneNumber: string; // Número de teléfono del usuario (clave primaria)

  @Column({ nullable: true })
  userName?: string; // Nombre del usuario

  @Column({ nullable: true })
  emotionalScale?: number; // Escala emocional del usuario (1-10)

  @Column({ nullable: true })
  emotionalState?: string; // Estado emocional del usuario (opcional)

  @Column({ default: 0 })
  interactionStreak?: number; // Racha de interacciones diarias

  @Column({ default: 0 })
  positiveEmotionStreak?: number; // Racha de emociones positivas (escala >= 7)

  @Column({ default: true }) // Agrega esta línea
  wantsSupport?: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastInteraction?: Date; // Fecha de la última interacción

  @Column({ type: 'timestamp', nullable: true })
  lastPositiveEmotionDate?: Date; // Fecha de la última emoción positiva

  @Column({ nullable: true })
  followUpTime?: string; // Hora de seguimiento (formato HH:mm)

  @Column({ type: 'timestamp', nullable: true })
  lastFollowUp?: Date; // Fecha del último mensaje de seguimiento

  @CreateDateColumn()
  createdAt?: Date; // Fecha de creación (se actualiza automáticamente)

  @UpdateDateColumn()
  updatedAt?: Date; // Fecha de última actualización (se actualiza automáticamente)

  @Column({ default: false })
  isSettingFollowUpTime?: boolean; // Indica si el usuario está configurando una hora de seguimiento

  @Column({ default: false })
  isChoosingResource?: boolean; // Nuevo campo: Indica si el usuario está eligiendo un recurso (foto, video o música)

  @Column({ default: false })
  recentlyOfferedHelp?: boolean;

  @Column({ default: false })
  isChoosingStressOption?: boolean;

  @Column({ nullable: true })
  lastFeedback?: string;

  @Column({ type: 'float', nullable: true })
  weeklyAverage?: number;

  @Column({ default: 0 })
  points?: number;

  @Column({ type: 'jsonb', default: [] })
  badges?: string[]; // Almacena nombres/emojis de insignias

  @Column({ type: 'jsonb', default: [] })
  unlockedAchievements?: string[]; // Logros como "7 días positivos"

  @Column({ type: 'jsonb', default: [] })
  resourcesUsed?: Array<{
    type: string;
    query: string;
    date: Date;
  }>;

  @OneToMany(() => EmotionalScaleHistory, (history) => history.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  emotionalScales?: EmotionalScaleHistory[]; // Historial de escalas emocionales
}
