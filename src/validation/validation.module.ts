// AI-Assisted
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ValidationService } from './validation.service';
import { ValidationController } from './validation.controller';

@Module({
  imports: [PrismaModule],
  providers: [ValidationService],
  controllers: [ValidationController],
  exports: [ValidationService],
})
export class ValidationModule {}
