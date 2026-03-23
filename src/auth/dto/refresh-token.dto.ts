import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token received at login or register' })
  @IsString()
  @MaxLength(2000)
  refreshToken!: string;
}
