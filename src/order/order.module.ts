import { Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'order-status-queue',
    }),
  ],
  controllers: [OrderController],
  providers: [OrderService, Logger],
})
export class OrderModule {}
