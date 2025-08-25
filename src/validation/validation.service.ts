// AI-Assisted
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalCount: number;
  validCount: number;
  invalidCount: number;
}

export interface ValidationSummary {
  ascii: ValidationResult;
  binary: ValidationResult;
  overall: {
    totalMessages: number;
    totalValid: number;
    totalInvalid: number;
    validationPassed: boolean;
  };
}

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async validateAsciiMessages(): Promise<ValidationResult> {
    const messages = await this.prismaService.msgAscii.findMany();
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      totalCount: messages.length,
      validCount: 0,
      invalidCount: 0,
    };

    for (const message of messages) {
      const validation = this.validateAsciiPayload(message.payload);
      if (validation.isValid) {
        result.validCount++;
      } else {
        result.invalidCount++;
        result.errors.push(`ID ${message.id}: ${validation.error}`);
      }
    }

    result.isValid = result.invalidCount === 0;

    this.logger.log(`ASCII validation completed: ${result.validCount}/${result.totalCount} valid`);
    return result;
  }

  async validateBinaryMessages(): Promise<ValidationResult> {
    const messages = await this.prismaService.msgBinary.findMany();
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      totalCount: messages.length,
      validCount: 0,
      invalidCount: 0,
    };

    for (const message of messages) {
      const validation = this.validateBinaryPayload(message.payload);
      if (validation.isValid) {
        result.validCount++;
      } else {
        result.invalidCount++;
        result.errors.push(`ID ${message.id}: ${validation.error}`);
      }

      // Add warnings for extremely large messages
      if (message.payload.length > 1024 * 1024 * 100) { // 100MB
        result.warnings.push(`ID ${message.id}: Large message (${message.payload.length} bytes)`);
      }
    }

    result.isValid = result.invalidCount === 0;

    this.logger.log(`Binary validation completed: ${result.validCount}/${result.totalCount} valid`);
    return result;
  }

  async getValidationSummary(): Promise<ValidationSummary> {
    const [asciiResult, binaryResult] = await Promise.all([
      this.validateAsciiMessages(),
      this.validateBinaryMessages(),
    ]);

    const totalMessages = asciiResult.totalCount + binaryResult.totalCount;
    const totalValid = asciiResult.validCount + binaryResult.validCount;
    const totalInvalid = asciiResult.invalidCount + binaryResult.invalidCount;

    return {
      ascii: asciiResult,
      binary: binaryResult,
      overall: {
        totalMessages,
        totalValid,
        totalInvalid,
        validationPassed: asciiResult.isValid && binaryResult.isValid,
      },
    };
  }

  async getFullValidationReport(): Promise<any> {
    const summary = await this.getValidationSummary();

    // Get sample messages for inspection
    const asciiSamples = await this.prismaService.msgAscii.findMany({
      take: 5,
      orderBy: { createdAt: 'asc' },
    });

    const binarySamples = await this.prismaService.msgBinary.findMany({
      take: 5,
      orderBy: { createdAt: 'asc' },
    });

    // Get message size statistics
    const binaryStats = await this.getBinaryMessageStats();

    return {
      summary,
      samples: {
        ascii: asciiSamples.map(msg => ({
          id: msg.id,
          payload: msg.payload,
          length: msg.payload.length,
          createdAt: msg.createdAt,
        })),
        binary: binarySamples.map(msg => ({
          id: msg.id,
          size: msg.payload.length,
          preview: msg.payload.subarray(0, 16).toString('hex'),
          createdAt: msg.createdAt,
        })),
      },
      statistics: {
        binary: binaryStats,
      },
    };
  }

  private validateAsciiPayload(payload: string): { isValid: boolean; error?: string } {
    // Check minimum length
    if (payload.length < 5) {
      return { isValid: false, error: `Payload too short: ${payload.length} characters (minimum 5)` };
    }

    // Check for forbidden characters ($ and ;)
    if (payload.includes('$') || payload.includes(';')) {
      return { isValid: false, error: 'Payload contains forbidden characters ($ or ;)' };
    }

    // Check if all characters are printable ASCII
    for (let i = 0; i < payload.length; i++) {
      const charCode = payload.charCodeAt(i);
      if (charCode < 32 || charCode > 126) {
        return { isValid: false, error: `Non-printable ASCII character at position ${i}: ${charCode}` };
      }
    }

    return { isValid: true };
  }

  private validateBinaryPayload(payload: Buffer): { isValid: boolean; error?: string } {
    // Binary payloads can be any sequence of bytes, so we just check basic properties
    if (payload.length === 0) {
      return { isValid: false, error: 'Empty binary payload' };
    }

    // Check for reasonable size limits (warn about extremely large messages)
    if (payload.length > 1024 * 1024 * 1024) { // 1GB
      return { isValid: false, error: `Binary payload too large: ${payload.length} bytes` };
    }

    return { isValid: true };
  }

  private async getBinaryMessageStats(): Promise<any> {
    const messages = await this.prismaService.msgBinary.findMany({
      select: { payload: true },
    });

    if (messages.length === 0) {
      return {
        count: 0,
        totalSize: 0,
        averageSize: 0,
        minSize: 0,
        maxSize: 0,
      };
    }

    const sizes = messages.map(msg => msg.payload.length);
    const totalSize = sizes.reduce((sum, size) => sum + size, 0);
    const averageSize = totalSize / sizes.length;
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);

    return {
      count: messages.length,
      totalSize,
      averageSize: Math.round(averageSize),
      minSize,
      maxSize,
    };
  }

  async simulateMessageParsing(rawData: Buffer): Promise<any> {
    // This method can be used to test message parsing logic
    // It simulates what the TCP client does when processing raw data
    const results = {
      asciiMessages: [],
      binaryMessages: [],
      unparsedData: null,
    };

    let buffer = Buffer.from(rawData);
    let offset = 0;

    while (offset < buffer.length) {
      // Try ASCII message
      const asciiResult = this.tryParseAsciiMessage(buffer, offset);
      if (asciiResult.found) {
        results.asciiMessages.push(asciiResult);
        offset = asciiResult.nextOffset;
        continue;
      }

      // Try binary message
      const binaryResult = this.tryParseBinaryMessage(buffer, offset);
      if (binaryResult.found) {
        results.binaryMessages.push(binaryResult);
        offset = binaryResult.nextOffset;
        continue;
      }

      // No message found, move to next byte
      offset++;
    }

    if (offset < buffer.length) {
      results.unparsedData = buffer.subarray(offset).toString('hex');
    }

    return results;
  }

  private tryParseAsciiMessage(buffer: Buffer, startOffset: number): any {
    const startIndex = buffer.indexOf('$', startOffset);
    if (startIndex === -1) {
      return { found: false };
    }

    const endIndex = buffer.indexOf(';', startIndex);
    if (endIndex === -1) {
      return { found: false };
    }

    const payload = buffer.subarray(startIndex + 1, endIndex).toString('ascii');
    return {
      found: true,
      type: 'ascii',
      payload,
      startOffset: startIndex,
      endOffset: endIndex,
      nextOffset: endIndex + 1,
      isValid: this.validateAsciiPayload(payload).isValid,
    };
  }

  private tryParseBinaryMessage(buffer: Buffer, startOffset: number): any {
    const headerIndex = buffer.indexOf(0xAA, startOffset);
    if (headerIndex === -1 || headerIndex + 6 > buffer.length) {
      return { found: false };
    }

    // Read payload size (5 bytes)
    const sizeBuffer = buffer.subarray(headerIndex + 1, headerIndex + 6);
    let payloadSize = 0;
    for (let i = 0; i < 5; i++) {
      payloadSize = payloadSize * 256 + sizeBuffer[i];
    }

    const totalMessageSize = 6 + payloadSize;
    if (headerIndex + totalMessageSize > buffer.length) {
      return { found: false };
    }

    const payload = buffer.subarray(headerIndex + 6, headerIndex + 6 + payloadSize);
    return {
      found: true,
      type: 'binary',
      payloadSize,
      payload: payload.toString('hex').substring(0, 32) + '...', // Preview only
      startOffset: headerIndex,
      endOffset: headerIndex + totalMessageSize - 1,
      nextOffset: headerIndex + totalMessageSize,
      isValid: this.validateBinaryPayload(payload).isValid,
    };
  }
}
