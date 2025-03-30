import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Response {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text', { array: true })
  patterns: string[];

  @Column({ nullable: true })
  intent: string;

  @Column('text', { array: true })
  responses: string[];
}
