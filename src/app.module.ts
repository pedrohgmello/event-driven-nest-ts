import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import Redis from 'ioredis';
import { BullModule } from '@nestjs/bullmq';
import { OrderModule } from './order/order.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (redisClient: Redis) => {
        return {
          //eslint-disable-next-line
          connection: redisClient as any,
        };
      },
      inject: ['REDIS_CLIENT'],
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      //eslint-disable-next-line
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
      }),
    }),
    OrderModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const client = new Redis(configService.get('REDIS_URL')!, {
          tls:
            process.env.NODE_ENV === 'production'
              ? { rejectUnauthorized: false }
              : undefined,
          retryStrategy: (times) => {
            if (times > 3) return null;
            return Math.min(times * 50, 2000);
          },
        });

        client.on('error', (err) => console.error('Erro Redis Cloud', err));
        return client;
      },
    },
  ],
})
export class AppModule implements OnModuleDestroy {
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}
  async onModuleDestroy() {
    await this.redisClient.quit();
  }
}
