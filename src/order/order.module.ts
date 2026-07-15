import { Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderProcessor } from './order-processor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    BullModule.registerQueue({
      name: 'order-status-queue',
    }),
  ],
  controllers: [OrderController],
  providers: [OrderService, Logger, OrderProcessor],
})
export class OrderModule {}
