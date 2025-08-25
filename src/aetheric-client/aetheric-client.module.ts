// AI-Assisted
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AethericClientService } from './aetheric-client.service';

@Module({
  imports: [PrismaModule],
  providers: [AethericClientService],
  exports: [AethericClientService],
})
export class AethericClientModule {}
