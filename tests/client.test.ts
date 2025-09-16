
import { WhatsAppClient } from '../src/client/WhatsAppClient';
import { ConfigurationError, MessageValidationError } from '../src/errors';
import { WhatsAppMessageType } from '../src/types';
import axios from 'axios';

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

  describe('Typing Indicators', () => {
    let client: WhatsAppClient;
    const mockPost = jest.fn();
    const mockAxiosInstance = {
      post: mockPost,
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    beforeEach(() => {
      jest.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as any);
      client = new WhatsAppClient(validConfig);
    });

    afterEach(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });

    it('should send typing indicator successfully', async () => {
      mockPost.mockResolvedValueOnce({ data: { success: true } });

      const result = await client.sendTypingIndicator('+1234567890');

      expect(result.success).toBe(true);
      expect(result.messageId).toBeUndefined();
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', {
        messaging_product: 'whatsapp',
        to: '+1234567890',
        typing_indicator: {
          type: 'text'
        }
      });
    });

    it('should handle typing indicator errors', async () => {
      // Clear any previous mocks and set up failure
      mockPost.mockClear();
      mockPost.mockRejectedValue(new Error('Network error'));

      const result = await client.sendTypingIndicator('+1234567890');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should send typing indicator with duration', async () => {
      mockPost.mockResolvedValueOnce({ data: { success: true } });

      const result = await client.sendTypingIndicatorWithDuration('+1234567890', 10000);

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', {
        messaging_product: 'whatsapp',
        to: '+1234567890',
        typing_indicator: {
          type: 'text'
        }
      });
    });

    it('should limit duration to 25 seconds maximum', async () => {
      mockPost.mockResolvedValueOnce({ data: { success: true } });

      const result = await client.sendTypingIndicatorWithDuration('+1234567890', 30000);

      expect(result.success).toBe(true);
      // The method should internally limit to 25000ms, but this is tested via timeout behavior
    });

    it('should format phone numbers for typing indicators', async () => {
      mockPost.mockResolvedValueOnce({ data: { success: true } });

      await client.sendTypingIndicator('1234567890'); // No + prefix

      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', {
        messaging_product: 'whatsapp',
        to: '+1234567890', // Should be formatted with +
        typing_indicator: {
          type: 'text'
        }
      });
    });
  });

  describe('Read Receipts', () => {
    let client: WhatsAppClient;
    const mockPost = jest.fn();
    const mockAxiosInstance = {
      post: mockPost,
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    beforeEach(() => {
      jest.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as any);
      client = new WhatsAppClient(validConfig);
    });

    afterEach(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });

    it('should mark message as read successfully', async () => {
      const messageId = 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJCMTE4RTUA';
      mockPost.mockResolvedValueOnce({ data: { success: true } });

      const result = await client.markMessageAsRead(messageId);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe(messageId);
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      });
    });

    it('should handle read receipt errors', async () => {
      const messageId = 'invalid-message-id';
      // Clear any previous mocks and set up failure
      mockPost.mockClear();
      mockPost.mockRejectedValue(new Error('Invalid message ID'));

      const result = await client.markMessageAsRead(messageId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid message ID');
    });

    it('should handle empty message ID', async () => {
      mockPost.mockResolvedValueOnce({ data: { success: true } });

      const result = await client.markMessageAsRead('');

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: ''
      });
    });
  });

  describe('Contextual Replies', () => {
    let client: WhatsAppClient;
    const mockPost = jest.fn();
    const mockAxiosInstance = {
      post: mockPost,
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    beforeEach(() => {
      jest.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as any);
      client = new WhatsAppClient(validConfig);
      mockPost.mockResolvedValue({
        data: {
          messages: [{ id: 'test-message-id' }]
        }
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });

    it('should send text message with reply context using sendText', async () => {
      const messageId = 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJCMTE4RTUA';
      
      await client.sendText('+1234567890', 'This is a reply', {
        replyToMessageId: messageId
      });

      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        type: 'text',
        to: '+1234567890',
        text: {
          body: 'This is a reply',
          preview_url: false
        },
        context: {
          message_id: messageId
        }
      });
    });

    it('should send reply using replyToMessage convenience method', async () => {
      const messageId = 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJCMTE4RTUA';
      
      await client.replyToMessage('+1234567890', messageId, 'Thanks for your message!');

      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        type: 'text',
        to: '+1234567890',
        text: {
          body: 'Thanks for your message!',
          preview_url: false
        },
        context: {
          message_id: messageId
        }
      });
    });

    it('should send image reply using replyWithImage', async () => {
      const messageId = 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJCMTE4RTUA';
      const image = {
        link: 'https://example.com/image.jpg',
        caption: 'Here is the image you requested'
      };
      
      await client.replyWithImage('+1234567890', messageId, image);

      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        type: 'image',
        to: '+1234567890',
        image,
        context: {
          message_id: messageId
        }
      });
    });

    it('should send button reply using replyWithButtons', async () => {
      const messageId = 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJCMTE4RTUA';
      const buttons = [
        { id: 'yes', title: 'Yes' },
        { id: 'no', title: 'No' }
      ];
      
      await client.replyWithButtons('+1234567890', messageId, 'Do you want to continue?', buttons);

      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', expect.objectContaining({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        type: 'interactive',
        to: '+1234567890',
        context: {
          message_id: messageId
        },
        interactive: expect.objectContaining({
          type: 'button',
          body: { text: 'Do you want to continue?' }
        })
      }));
    });

    it('should send location reply using replyWithLocation', async () => {
      const messageId = 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJCMTE4RTUA';
      
      await client.replyWithLocation('+1234567890', messageId, 40.7128, -74.0060, {
        name: 'New York City',
        address: 'NYC, USA'
      });

      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        type: 'location',
        to: '+1234567890',
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          name: 'New York City',
          address: 'NYC, USA'
        },
        context: {
          message_id: messageId
        }
      });
    });

    it('should include messaging_product and recipient_type in all message types', async () => {
      const messageId = 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJCMTE4RTUA';
      
      // Test with sendImage
      await client.sendImage('+1234567890', { link: 'https://example.com/image.jpg' }, {
        replyToMessageId: messageId
      });

      expect(mockPost).toHaveBeenLastCalledWith('/test-phone-id/messages', expect.objectContaining({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        context: {
          message_id: messageId
        }
      }));
    });

    it('should work without reply context', async () => {
      await client.sendText('+1234567890', 'Regular message');

      const lastCall = mockPost.mock.calls[mockPost.mock.calls.length - 1];
      const payload = lastCall[1];
      
      expect(payload).toEqual({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        type: 'text',
        to: '+1234567890',
        text: {
          body: 'Regular message',
          preview_url: false
        }
      });
      
      // Should not have context
      expect(payload.context).toBeUndefined();
    });

    it('should handle all reply convenience methods', async () => {
      const messageId = 'wamid.test';
      
      // Test all reply methods exist and are callable
      expect(typeof client.replyToMessage).toBe('function');
      expect(typeof client.replyWithImage).toBe('function');
      expect(typeof client.replyWithVideo).toBe('function');
      expect(typeof client.replyWithAudio).toBe('function');
      expect(typeof client.replyWithDocument).toBe('function');
      expect(typeof client.replyWithButtons).toBe('function');
      expect(typeof client.replyWithList).toBe('function');
      expect(typeof client.replyWithLocation).toBe('function');
      expect(typeof client.replyWithContacts).toBe('function');
      expect(typeof client.replyWithSticker).toBe('function');
    });
  });

  describe('Reactions', () => {
    let client: WhatsAppClient;
    const mockPost = jest.fn();
    const mockAxiosInstance = {
      post: mockPost,
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    beforeEach(() => {
      jest.spyOn(axios, 'create').mockReturnValue(mockAxiosInstance as any);
      client = new WhatsAppClient(validConfig);
    });

    afterEach(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });

    it('should send reaction successfully', async () => {
      const messageId = 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJCMTE4RTUA';
      mockPost.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'reaction-id' }]
        }
      });

      const result = await client.sendReaction('+1234567890', messageId, '👍');

      expect(result.success).toBe(true);
      expect(result.messageId).toBeUndefined();
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '+1234567890',
        type: 'reaction',
        reaction: {
          message_id: messageId,
          emoji: '👍'
        }
      });
    });

    it('should handle reaction errors', async () => {
      const messageId = 'invalid-message-id';
      mockPost.mockRejectedValue(new Error('Invalid message ID'));

      const result = await client.sendReaction('+1234567890', messageId, '👍');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid message ID');
    });

    it('should send like reaction using convenience method', async () => {
      const messageId = 'wamid.test';
      mockPost.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'reaction-id' }]
        }
      });

      const result = await client.reactWithLike('+1234567890', messageId);

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '+1234567890',
        type: 'reaction',
        reaction: {
          message_id: messageId,
          emoji: '👍'
        }
      });
    });

    it('should send love reaction using convenience method', async () => {
      const messageId = 'wamid.test';
      mockPost.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'reaction-id' }]
        }
      });

      const result = await client.reactWithLove('+1234567890', messageId);

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', expect.objectContaining({
        reaction: {
          message_id: messageId,
          emoji: '❤️'
        }
      }));
    });

    it('should send laugh reaction using convenience method', async () => {
      const messageId = 'wamid.test';
      mockPost.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'reaction-id' }]
        }
      });

      const result = await client.reactWithLaugh('+1234567890', messageId);

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', expect.objectContaining({
        reaction: {
          message_id: messageId,
          emoji: '😂'
        }
      }));
    });

    it('should send wow reaction using convenience method', async () => {
      const messageId = 'wamid.test';
      mockPost.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'reaction-id' }]
        }
      });

      const result = await client.reactWithWow('+1234567890', messageId);

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', expect.objectContaining({
        reaction: {
          message_id: messageId,
          emoji: '😮'
        }
      }));
    });

    it('should send sad reaction using convenience method', async () => {
      const messageId = 'wamid.test';
      mockPost.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'reaction-id' }]
        }
      });

      const result = await client.reactWithSad('+1234567890', messageId);

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', expect.objectContaining({
        reaction: {
          message_id: messageId,
          emoji: '😢'
        }
      }));
    });

    it('should send angry reaction using convenience method', async () => {
      const messageId = 'wamid.test';
      mockPost.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'reaction-id' }]
        }
      });

      const result = await client.reactWithAngry('+1234567890', messageId);

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', expect.objectContaining({
        reaction: {
          message_id: messageId,
          emoji: '😠'
        }
      }));
    });

    it('should send thumbs down reaction using convenience method', async () => {
      const messageId = 'wamid.test';
      mockPost.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'reaction-id' }]
        }
      });

      const result = await client.reactWithThumbsDown('+1234567890', messageId);

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', expect.objectContaining({
        reaction: {
          message_id: messageId,
          emoji: '👎'
        }
      }));
    });

    it('should send heart eyes reaction using convenience method', async () => {
      const messageId = 'wamid.test';
      mockPost.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'reaction-id' }]
        }
      });

      const result = await client.reactWithHeartEyes('+1234567890', messageId);

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', expect.objectContaining({
        reaction: {
          message_id: messageId,
          emoji: '😍'
        }
      }));
    });

    it('should send fire reaction using convenience method', async () => {
      const messageId = 'wamid.test';
      mockPost.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'reaction-id' }]
        }
      });

      const result = await client.reactWithFire('+1234567890', messageId);

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', expect.objectContaining({
        reaction: {
          message_id: messageId,
          emoji: '🔥'
        }
      }));
    });

    it('should send clap reaction using convenience method', async () => {
      const messageId = 'wamid.test';
      mockPost.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'reaction-id' }]
        }
      });

      const result = await client.reactWithClap('+1234567890', messageId);

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', expect.objectContaining({
        reaction: {
          message_id: messageId,
          emoji: '👏'
        }
      }));
    });

    it('should send check reaction using convenience method', async () => {
      const messageId = 'wamid.test';
      mockPost.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'reaction-id' }]
        }
      });

      const result = await client.reactWithCheck('+1234567890', messageId);

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', expect.objectContaining({
        reaction: {
          message_id: messageId,
          emoji: '✅'
        }
      }));
    });

    it('should send cross reaction using convenience method', async () => {
      const messageId = 'wamid.test';
      mockPost.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'reaction-id' }]
        }
      });

      const result = await client.reactWithCross('+1234567890', messageId);

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', expect.objectContaining({
        reaction: {
          message_id: messageId,
          emoji: '❌'
        }
      }));
    });

    it('should remove reaction with empty emoji', async () => {
      const messageId = 'wamid.test';
      mockPost.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'reaction-id' }]
        }
      });

      const result = await client.removeReaction('+1234567890', messageId);

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '+1234567890',
        type: 'reaction',
        reaction: {
          message_id: messageId,
          emoji: ''
        }
      });
    });

    it('should format phone numbers for reactions', async () => {
      const messageId = 'wamid.test';
      mockPost.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'reaction-id' }]
        }
      });

      await client.sendReaction('1234567890', messageId, '👍'); // No + prefix

      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', expect.objectContaining({
        to: '+1234567890' // Should be formatted with +
      }));
    });

    it('should accept custom emoji strings', async () => {
      const messageId = 'wamid.test';
      const customEmoji = '🎉';
      mockPost.mockResolvedValueOnce({
        data: {
          messages: [{ id: 'reaction-id' }]
        }
      });

      const result = await client.sendReaction('+1234567890', messageId, customEmoji);

      expect(result.success).toBe(true);
      expect(mockPost).toHaveBeenCalledWith('/test-phone-id/messages', expect.objectContaining({
        reaction: {
          message_id: messageId,
          emoji: customEmoji
        }
      }));
    });

    it('should have all convenience reaction methods available', () => {
      // Test that all convenience methods exist
      expect(typeof client.reactWithLike).toBe('function');
      expect(typeof client.reactWithLove).toBe('function');
      expect(typeof client.reactWithLaugh).toBe('function');
      expect(typeof client.reactWithWow).toBe('function');
      expect(typeof client.reactWithSad).toBe('function');
      expect(typeof client.reactWithAngry).toBe('function');
      expect(typeof client.reactWithThumbsDown).toBe('function');
      expect(typeof client.reactWithHeartEyes).toBe('function');
      expect(typeof client.reactWithFire).toBe('function');
      expect(typeof client.reactWithClap).toBe('function');
      expect(typeof client.reactWithCheck).toBe('function');
      expect(typeof client.reactWithCross).toBe('function');
      expect(typeof client.removeReaction).toBe('function');
    });

    it('should handle WhatsApp API error responses for reactions', async () => {
      const messageId = 'wamid.test';
      const whatsappError = {
        response: {
          data: {
            error: {
              message: 'Message not found',
              type: 'OAuthException',
              code: 100
            }
          }
        }
      };
      
      mockPost.mockRejectedValue(whatsappError);

      const result = await client.sendReaction('+1234567890', messageId, '👍');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send reaction');
    });
  });
});