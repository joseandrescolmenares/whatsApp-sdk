
import { WhatsAppClient } from '../src/client/WhatsAppClient';
import { ConfigurationError, MessageValidationError } from '../src/errors';
import { WhatsAppMessageType } from '../src/types';

describe('WhatsAppClient', () => {
  const validConfig = {
    accessToken: 'test-token',
    phoneNumberId: 'test-phone-id'
  };

  describe('Initialization', () => {
    it('should create client with valid config', () => {
      expect(() => new WhatsAppClient(validConfig)).not.toThrow();
    });

    it('should throw ConfigurationError for missing accessToken', () => {
      const invalidConfig = { phoneNumberId: 'test-phone-id' } as any;
      expect(() => new WhatsAppClient(invalidConfig)).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for missing phoneNumberId', () => {
      const invalidConfig = { accessToken: 'test-token' } as any;
      expect(() => new WhatsAppClient(invalidConfig)).toThrow(ConfigurationError);
    });

    it('should set default configuration values', () => {
      const client = new WhatsAppClient(validConfig);
      const config = client.getConfig();
      
      expect(config.baseUrl).toBe('https://graph.facebook.com');
      expect(config.apiVersion).toBe('v23.0');
      expect(config.timeout).toBe(30000);
    });
  });

  describe('Webhook Verification', () => {
    it('should verify valid webhook', () => {
      const client = new WhatsAppClient({
        ...validConfig,
        webhookVerifyToken: 'test-token'
      });

      const result = client.verifyWebhook('subscribe', 'test-token', '12345');
      expect(result).toBe(12345);
    });

    it('should reject invalid webhook token', () => {
      const client = new WhatsAppClient({
        ...validConfig,
        webhookVerifyToken: 'valid-token'
      });

      const result = client.verifyWebhook('subscribe', 'invalid-token', '12345');
      expect(result).toBeNull();
    });

    it('should reject invalid webhook mode', () => {
      const client = new WhatsAppClient({
        ...validConfig,
        webhookVerifyToken: 'test-token'
      });

      const result = client.verifyWebhook('invalid-mode', 'test-token', '12345');
      expect(result).toBeNull();
    });
  });

  describe('Message Parsing', () => {
    it('should parse text message webhook', () => {
      const client = new WhatsAppClient(validConfig);
      
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'business-id',
          changes: [{
            value: {
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: 'phone-id'
              },
              messages: [{
                id: 'message-id',
                from: '+0987654321',
                timestamp: '1234567890',
                type: WhatsAppMessageType.TEXT,
                text: { body: 'Hello World' }
              }],
              contacts: [{
                profile: { name: 'John Doe' }
              }]
            }
          }]
        }]
      };

      const messages = client.parseWebhook(webhookPayload);
      
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('message-id');
      expect(messages[0].from).toBe('+0987654321');
      expect(messages[0].type).toBe('text');
      expect(messages[0].text).toBe('Hello World');
      expect(messages[0].contact?.name).toBe('John Doe');
    });

    it('should handle webhook with no messages', () => {
      const client = new WhatsAppClient(validConfig);
      
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'business-id',
          changes: [{
            value: {
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: 'phone-id'
              }
            }
          }]
        }]
      };

      const messages = client.parseWebhook(webhookPayload);
      expect(messages).toHaveLength(0);
    });
  });

  describe('Connection Test', () => {
    it('should have testConnection method', () => {
      const client = new WhatsAppClient(validConfig);
      expect(typeof client.testConnection).toBe('function');
    });
  });
});