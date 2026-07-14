import {
  Injectable,
  Inject,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { nanoid } from 'nanoid';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';

interface CreateOrderJobData {
  orderId: string;
  productId: string;
  quantity: number;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectQueue('order-status-queue')
    private readonly orderStatusQueue: Queue<CreateOrderJobData>,
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis,
    @InjectRepository(Order)
    private readonly repository: Repository<Order>,
  ) {}
  async acceptOrder(createOrderDto: CreateOrderDto) {
    const productKey = `produto:${createOrderDto.productId}:estoque`;
    const newProductStock = await this.redisClient.decrby(
      productKey,
      createOrderDto.quantity,
    );
    if (newProductStock < 0) {
      await this.redisClient.incrby(productKey, createOrderDto.quantity);
      throw new UnprocessableEntityException(
        'Estoque Insuficiente para o produto solicitado',
      );
    }
    const job = await this.orderStatusQueue.add(
      'order_approved',
      {
        orderId: `or_${nanoid(12)}`,
        productId: createOrderDto.productId,
        quantity: createOrderDto.quantity,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      },
    );

    return {
      orderId: job.data.orderId,
      productId: job.data.productId,
      quantity: job.data.quantity,
      status: 'APPROVED',
    };
  }

  async create(createOrder: CreateOrderJobData) {
    const order = this.repository.create({
      id: createOrder.orderId,
      product_id: createOrder.productId,
      quantity: createOrder.quantity,
      processed_at: new Date(),
    });
    return this.repository.save(order);
  }
}
