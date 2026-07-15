import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrderService } from './order.service';

interface OrderJobData {
  orderId: string;
  email: string;
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
    const { orderId, productId, quantity, email } = job.data;
    console.log('[WORKER] Salvando pedido confirmado: ', orderId);
    try {
      const pedido = await this.service.create({
        orderId,
        productId,
        quantity,
        email,
      });
      console.log('[WORKER] Pedido salvo com sucesso:', pedido);
    } catch (err) {
      console.error('[WORKER] ERRO AO SALVAR:', err);
      throw err; // mantém o retry do BullMQ
    }
    console.log('[WORKER] Enviando email de confirmação de pedido');
    this.sendConfirmationEmail(productId, email);
  }

  private sendConfirmationEmail(productId: string, email: string) {
    // Simulando um delay de rede sem travar a resposta principal da API
    setTimeout(() => {
      this.logger.log(
        `[EmailService] E-mail de confirmação enviado para ${email} ref. ao produto ${productId}`,
      );
    }, 1000);
  }
}
