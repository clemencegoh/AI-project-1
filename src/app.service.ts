// AI-Assisted
import { Injectable } from '@nestjs/common';
import { AethericClientService, CollectionStatus } from './aetheric-client/aetheric-client.service';

@Injectable()
export class AppService {
  constructor(private readonly aethericClientService: AethericClientService) {}

  getHello(): string {
    return 'Aetheric Engine TCP Client - Ready to collect messages!';
  }

  async startMessageCollection() {
    try {
      await this.aethericClientService.startCollection();
      return { message: 'Message collection started successfully' };
    } catch (error) {
      return { error: 'Failed to start collection', details: error.message };
    }
  }

  async getCollectionStatus(): Promise<CollectionStatus> {
    return this.aethericClientService.getStatus();
  }
}
