// AI-Assisted
import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { CollectionStatus } from './aetheric-client/aetheric-client.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('start-collection')
  async startCollection() {
    return this.appService.startMessageCollection();
  }

  @Get('status')
  async getStatus(): Promise<CollectionStatus> {
    return this.appService.getCollectionStatus();
  }
}
