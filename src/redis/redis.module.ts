// redis.module.ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const client = new Redis(configService.get('REDIS_URL')!, {
          maxRetriesPerRequest: null,
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
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
