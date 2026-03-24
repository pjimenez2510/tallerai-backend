import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class AddPartDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4', { message: 'productId debe ser un UUID válido' })
  productId!: string;

  @ApiProperty({ example: 2, description: 'Cantidad a usar (descuenta stock)' })
  @IsInt()
  @Min(1)
  quantity!: number;
}
