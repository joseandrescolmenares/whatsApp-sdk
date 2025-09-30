import {
  validatePhoneNumber,
  validateConfig,
  validateMessage,
  validateMediaFile
} from '../src/utils/validation';

import { ConfigurationError, MessageValidationError } from '../src/errors';
import { WhatsAppMessageType } from '../src/types';

describe('Validation Functions', () => {
  describe('validatePhoneNumber', () => {
    it('should validate correct phone numbers', () => {
      expect(validatePhoneNumber('+1234567890')).toBe(true);
      expect(validatePhoneNumber('1234567890')).toBe(true);
      expect(validatePhoneNumber('+524411234567')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('')).toBe(false);
      expect(validatePhoneNumber('abc')).toBe(false);
      expect(validatePhoneNumber('1')).toBe(false);
      expect(validatePhoneNumber('+0123456789')).toBe(false); // starts with 0
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const validConfig = {
        accessToken: 'test-token-123456789012345678901234567890',
        phoneNumberId: 'phone-id-123'
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    it('should throw ConfigurationError for missing accessToken', () => {
      const config = { phoneNumberId: 'test-id' } as any;
      
      expect(() => validateConfig(config))
        .toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for missing phoneNumberId', () => {
      const config = { accessToken: 'test-token' } as any;
      
      expect(() => validateConfig(config))
        .toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for token too short', () => {
      const config = {
        accessToken: 'short',
        phoneNumberId: 'test-id'
      };

      expect(() => validateConfig(config))
        .toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for token with whitespace', () => {
      const config = {
        accessToken: 'token with spaces 12345678901234567890',
        phoneNumberId: 'test-id'
      };

      expect(() => validateConfig(config))
        .toThrow(ConfigurationError);
    });
  });

  describe('validateMessage', () => {
    it('should validate text messages', () => {
      const message = {
        type: WhatsAppMessageType.TEXT,
        to: '+1234567890',
        text: { body: 'Hello World' }
      } as any;

      expect(() => validateMessage(message)).not.toThrow();
    });

    it('should throw MessageValidationError for missing recipient', () => {
      const message = {
        type: WhatsAppMessageType.TEXT,
        text: { body: 'Hello' }
      } as any;

      expect(() => validateMessage(message))
        .toThrow(MessageValidationError);
    });

    it('should throw MessageValidationError for invalid phone number', () => {
      const message = {
        type: WhatsAppMessageType.TEXT,
        to: 'invalid-phone',
        text: { body: 'Hello' }
      } as any;

      expect(() => validateMessage(message))
        .toThrow(MessageValidationError);
    });

    it('should throw MessageValidationError for missing text body', () => {
      const message = {
        type: WhatsAppMessageType.TEXT,
        to: '+1234567890',
        text: {}
      } as any;

      expect(() => validateMessage(message))
        .toThrow(MessageValidationError);
    });

    it('should throw MessageValidationError for text too long', () => {
      const message = {
        type: WhatsAppMessageType.TEXT,
        to: '+1234567890',
        text: { body: 'a'.repeat(4097) }
      } as any;

      expect(() => validateMessage(message))
        .toThrow(MessageValidationError);
    });
  });

  describe('validateMediaFile', () => {
    it('should validate media files within size limits', () => {
      const buffer = Buffer.alloc(1024 * 1024); // 1MB
      
      expect(() => validateMediaFile(buffer, 'image')).not.toThrow();
      expect(() => validateMediaFile(buffer, 'video')).not.toThrow();
      expect(() => validateMediaFile(buffer, 'audio')).not.toThrow();
      expect(() => validateMediaFile(buffer, 'document')).not.toThrow();
    });

    it('should throw MessageValidationError for files too large', () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      
      expect(() => validateMediaFile(largeBuffer, 'image'))
        .toThrow(MessageValidationError);
    });
  });
});