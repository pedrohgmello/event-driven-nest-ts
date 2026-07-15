/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Matches, IsInt, Min, IsEmail } from 'class-validator';

export class CreateOrderDto {
  @Matches(/^[A-Za-z0-9_-]{12}$/, {
    message: 'Invalid NanoID format',
  })
  productId!: string;

  @IsInt()
  @Min(1, { message: 'A quantidade minima para um pedido é 1 unit.' })
  quantity!: number;

  @IsEmail()
  email!: string;
}
