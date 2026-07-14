import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('order')
export class Order {
  @PrimaryColumn({ type: 'varchar', length: 12 })
  id!: string;

  @Column({ type: 'varchar', length: 12 })
  product_id!: string;

  @Column({ type: 'varchar', length: '50' })
  email!: string;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ type: 'timestamp' })
  processed_at!: Date;
}
