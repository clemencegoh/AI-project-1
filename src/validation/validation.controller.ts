// AI-Assisted
import { Controller, Get } from '@nestjs/common';
import { ValidationService, ValidationResult, ValidationSummary } from './validation.service';

@Controller('validation')
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

  @Get('ascii')
  async validateAsciiMessages(): Promise<ValidationResult> {
    return this.validationService.validateAsciiMessages();
  }

  @Get('binary')
  async validateBinaryMessages(): Promise<ValidationResult> {
    return this.validationService.validateBinaryMessages();
  }

  @Get('summary')
  async getValidationSummary(): Promise<ValidationSummary> {
    return this.validationService.getValidationSummary();
  }

  @Get('full-report')
  async getFullValidationReport() {
    return this.validationService.getFullValidationReport();
  }
}
