import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrderService } from './order.service';

interface OrderJobData {
  orderId: string;
  userEmail: string;
  productId: string;
  quantity: number;
}

@Processor('order-status-queue')
export class OrderProcessor extends WorkerHost {
  constructor(
    @Inject(Logger)
    private readonly logger: Logger,
    @Inject(OrderService)
    private readonly service: OrderService,
  ) {
    super();
  }

  async process(job: Job<OrderJobData>) {
    console.log(`[WORKER] Capturou o Job ${job.id} do tipo ${job.name}`);
    const { orderId, productId, quantity, userEmail } = job.data;
    console.log('[WORKER] Salvando pedido confirmado: ', orderId);
    //eslint-disable-next-line
    const pedido = await this.service.create({ orderId, productId, quantity });
    console.log('[WORKER] Enviando email de confirmação de pedido');
    this.sendConfirmationEmail(productId, userEmail);
  }

  private sendConfirmationEmail(productId: string, email: string) {
    // Simulando um delay de rede sem travar a resposta principal da API
    setTimeout(() => {
      //eslint-disable-next-line
            this.logger.log(`[EmailService] E-mail de confirmação enviado para ${email} ref. ao produto ${productId}`);
    }, 1000);
  }
}
