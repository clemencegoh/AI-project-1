// AI-Assisted
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';
import { PrismaService } from '../prisma/prisma.service';

export interface CollectionStatus {
  isRunning: boolean;
  totalMessages: number;
  asciiMessages: number;
  binaryMessages: number;
  targetMessages: number;
  errors: string[];
}

@Injectable()
export class AethericClientService {
  private readonly logger = new Logger(AethericClientService.name);
  private client: net.Socket | null = null;
  private status: CollectionStatus = {
    isRunning: false,
    totalMessages: 0,
    asciiMessages: 0,
    binaryMessages: 0,
    targetMessages: 600,
    errors: [],
  };
  private buffer = Buffer.alloc(0);

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  async startCollection(): Promise<void> {
    if (this.status.isRunning) {
      throw new Error('Collection is already running');
    }

    this.resetStatus();
    this.status.isRunning = true;

    const host = this.configService.get<string>('AE_SERVER_HOST');
    const port = this.configService.get<number>('AE_SERVER_PORT');
    const jwtToken = this.configService.get<string>('JWT_TOKEN');

    this.logger.log(`Connecting to Aetheric Engine at ${host}:${port}`);

    return new Promise((resolve, reject) => {
      this.client = new net.Socket();

      this.client.connect(port, host, () => {
        this.logger.log('Connected to Aetheric Engine');

        // Send authentication
        const authMessage = `AUTH ${jwtToken}`;
        this.client.write(authMessage);
        this.logger.log('Authentication sent');
        resolve();
      });

      this.client.on('data', (data) => {
        this.handleIncomingData(data);
      });

      this.client.on('error', (error) => {
        this.logger.error('TCP connection error:', error);
        this.status.errors.push(error.message);
        this.status.isRunning = false;
        reject(error);
      });

      this.client.on('close', () => {
        this.logger.log('Connection closed');
        this.status.isRunning = false;
      });
    });
  }

  private handleIncomingData(data: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, data]);
    this.processBuffer();
  }

  private processBuffer(): void {
    while (this.buffer.length > 0) {
      const processed = this.tryProcessMessage();
      if (!processed) {
        break;
      }
    }
  }

  private tryProcessMessage(): boolean {
    // Try to process ASCII message first
    const asciiResult = this.tryProcessAsciiMessage();
    if (asciiResult) {
      return true;
    }

    // Try to process binary message
    const binaryResult = this.tryProcessBinaryMessage();
    if (binaryResult) {
      return true;
    }

    return false;
  }

  private tryProcessAsciiMessage(): boolean {
    // Look for ASCII message pattern: $...;
    const startIndex = this.buffer.indexOf('$');
    if (startIndex === -1) {
      return false;
    }

    const endIndex = this.buffer.indexOf(';', startIndex);
    if (endIndex === -1) {
      return false;
    }

    // Extract the complete message including markers
    const messageLength = endIndex - startIndex + 1;
    const messageBuffer = this.buffer.subarray(startIndex, endIndex + 1);
    const payload = messageBuffer.subarray(1, messageBuffer.length - 1).toString('ascii');

    // Validate payload (5 or more printable ASCII characters, no $ or ;)
    if (payload.length >= 5 && this.isValidAsciiPayload(payload)) {
      this.saveAsciiMessage(payload);
      this.status.asciiMessages++;
      this.status.totalMessages++;
      this.logger.log(`ASCII message saved: ${payload.substring(0, 20)}...`);
    }

    // Remove processed message from buffer
    this.buffer = Buffer.concat([
      this.buffer.subarray(0, startIndex),
      this.buffer.subarray(endIndex + 1)
    ]);

    this.checkCollectionComplete();
    return true;
  }

  private tryProcessBinaryMessage(): boolean {
    // Check if we have enough bytes for header
    if (this.buffer.length < 6) {
      return false;
    }

    // Check for binary message header (0xAA)
    const headerIndex = this.buffer.indexOf(0xAA);
    if (headerIndex === -1) {
      return false;
    }

    // Check if we have enough bytes for the size field
    if (this.buffer.length < headerIndex + 6) {
      return false;
    }

    // Read payload size (5 bytes, big-endian)
    const sizeBuffer = this.buffer.subarray(headerIndex + 1, headerIndex + 6);
    const payloadSize = this.readUInt40BE(sizeBuffer);

    // Check if we have the complete message
    const totalMessageSize = 6 + payloadSize;
    if (this.buffer.length < headerIndex + totalMessageSize) {
      return false;
    }

    // Extract payload
    const payload = this.buffer.subarray(headerIndex + 6, headerIndex + 6 + payloadSize);

    this.saveBinaryMessage(payload);
    this.status.binaryMessages++;
    this.status.totalMessages++;
    this.logger.log(`Binary message saved: ${payloadSize} bytes`);

    // Remove processed message from buffer
    this.buffer = Buffer.concat([
      this.buffer.subarray(0, headerIndex),
      this.buffer.subarray(headerIndex + totalMessageSize)
    ]);

    this.checkCollectionComplete();
    return true;
  }

  private readUInt40BE(buffer: Buffer): number {
    // Read 5 bytes as big-endian unsigned integer
    let value = 0;
    for (let i = 0; i < 5; i++) {
      value = value * 256 + buffer[i];
    }
    return value;
  }

  private isValidAsciiPayload(payload: string): boolean {
    // Check if all characters are printable ASCII and not $ or ;
    for (let i = 0; i < payload.length; i++) {
      const char = payload[i];
      const code = char.charCodeAt(0);
      if (code < 32 || code > 126 || char === '$' || char === ';') {
        return false;
      }
    }
    return true;
  }

  private async saveAsciiMessage(payload: string): Promise<void> {
    try {
      await this.prismaService.msgAscii.create({
        data: { payload },
      });
    } catch (error) {
      this.logger.error('Failed to save ASCII message:', error);
      this.status.errors.push(`ASCII save error: ${error.message}`);
    }
  }

  private async saveBinaryMessage(payload: Buffer): Promise<void> {
    try {
      await this.prismaService.msgBinary.create({
        data: { payload },
      });
    } catch (error) {
      this.logger.error('Failed to save binary message:', error);
      this.status.errors.push(`Binary save error: ${error.message}`);
    }
  }

  private checkCollectionComplete(): void {
    if (this.status.totalMessages >= this.status.targetMessages) {
      this.logger.log(`Target of ${this.status.targetMessages} messages reached. Stopping collection.`);
      this.stopCollection();
    }
  }

  private async stopCollection(): Promise<void> {
    if (this.client && !this.client.destroyed) {
      // Send STATUS command to stop the engine
      this.client.write('STATUS');
      this.logger.log('STATUS command sent');

      // Drain the TCP pipe before disconnecting
      await this.drainSocket();

      this.client.destroy();
      this.client = null;
    }
    this.status.isRunning = false;
    this.logger.log('Collection stopped');
  }

  private async drainSocket(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.client) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        resolve();
      }, 5000); // 5 second timeout

      this.client.on('data', (data) => {
        this.handleIncomingData(data);
      });

      this.client.on('end', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.client.on('close', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  private resetStatus(): void {
    this.status = {
      isRunning: false,
      totalMessages: 0,
      asciiMessages: 0,
      binaryMessages: 0,
      targetMessages: 600,
      errors: [],
    };
    this.buffer = Buffer.alloc(0);
  }

  getStatus(): CollectionStatus {
    return { ...this.status };
  }

  async forceStop(): Promise<void> {
    if (this.status.isRunning) {
      await this.stopCollection();
    }
  }
}
