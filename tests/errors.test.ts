import {
  WhatsAppApiError,
  ConfigurationError,
  WebhookVerificationError,
  MediaProcessingError,
  RateLimitError,
  MessageValidationError
} from '../src/errors';

import { WhatsAppMessageType } from '../src/types';

describe('Error Classes', () => {
  describe('WhatsAppApiError', () => {
    it('should create error with basic message', () => {
      const error = new WhatsAppApiError('Test error');
      
      expect(error.name).toBe('WhatsAppApiError');
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(400);
      expect(error.code).toBe(0);
      expect(error.type).toBe('unknown');
    });

    it('should create error with full error data', () => {
      const errorData = {
        message: 'API Error',
        type: 'validation_error',
        code: 1001,
        error_data: {
          messaging_product: 'whatsapp',
          details: 'Invalid phone number'
        },
        fbtrace_id: 'trace123'
      };

      const message = {
        type: WhatsAppMessageType.TEXT,
        to: '+1234567890',
        text: { body: 'Hello' }
      } as any;

      const error = new WhatsAppApiError(
        'Test error',
        errorData,
        message,
        422
      );

      expect(error.status).toBe(422);
      expect(error.code).toBe(1001);
      expect(error.type).toBe('validation_error');
      expect(error.details).toBe('Invalid phone number');
      expect(error.fbtrace_id).toBe('trace123');
      expect(error.originalMessage).toBe(message);
    });
  });

  describe('ConfigurationError', () => {
    it('should create error with basic message', () => {
      const error = new ConfigurationError('Missing config');
      
      expect(error.name).toBe('ConfigurationError');
      expect(error.message).toBe('Missing config');
    });

    it('should create error with missing fields', () => {
      const error = new ConfigurationError(
        'Missing required fields',
        ['accessToken', 'phoneNumberId']
      );
      
      expect(error.message).toBe(
        'Missing required fields. Missing: accessToken, phoneNumberId'
      );
    });
  });

  describe('WebhookVerificationError', () => {
    it('should create error with default message', () => {
      const error = new WebhookVerificationError();
      
      expect(error.name).toBe('WebhookVerificationError');
      expect(error.message).toBe('Webhook verification failed');
    });

    it('should create error with custom message', () => {
      const error = new WebhookVerificationError('Custom message');
      
      expect(error.message).toBe('Custom message');
    });
  });

  describe('MediaProcessingError', () => {
    it('should create error with basic message', () => {
      const error = new MediaProcessingError('Media error');
      
      expect(error.name).toBe('MediaProcessingError');
      expect(error.message).toBe('Media error');
      expect(error.mediaId).toBeUndefined();
    });

    it('should create error with media ID', () => {
      const error = new MediaProcessingError('Media error', 'media123');
      
      expect(error.mediaId).toBe('media123');
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error', () => {
      const error = new RateLimitError('Rate limited');
      
      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe('Rate limited');
    });

    it('should create rate limit error with retry after', () => {
      const error = new RateLimitError('Rate limited', 60);
      
      expect(error.retryAfter).toBe(60);
    });
  });

  describe('MessageValidationError', () => {
    it('should create validation error', () => {
      const error = new MessageValidationError('Invalid message', 'to');
      
      expect(error.name).toBe('MessageValidationError');
      expect(error.message).toBe('Invalid message');
      expect(error.field).toBe('to');
    });
  });
});