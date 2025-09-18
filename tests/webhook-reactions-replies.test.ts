import { WebhookProcessor } from '../src/webhooks/WebhookProcessor';
import { WhatsAppMessageType, ProcessedIncomingMessage } from '../src/types';

describe('WebhookProcessor - Reactions and Replies', () => {
  let processor: WebhookProcessor;
  let mockHandlers: any;

  beforeEach(() => {
    mockHandlers = {
      onReactionMessage: jest.fn(),
      onReplyMessage: jest.fn(),
      onTextMessage: jest.fn(),
      onError: jest.fn()
    };

    processor = new WebhookProcessor({
      verifyToken: 'test-token',
      handlers: mockHandlers
    });
  });

  describe('Reaction Messages', () => {
    it('should process incoming reaction messages correctly', async () => {
      const reactionWebhook = {
        object: 'whatsapp',
        entry: [{
          id: 'PHONE_NUMBER_ID',
          changes: [{
            value: {
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: '123456789'
              },
              messages: [{
                from: '1234567890',
                id: 'wamid.reaction123',
                timestamp: '1640995200',
                type: WhatsAppMessageType.REACTION,
                reaction: {
                  message_id: 'wamid.original123',
                  emoji: '👍'
                }
              }]
            },
            field: 'messages'
          }]
        }]
      };

      const result = await processor.processWebhook(reactionWebhook);

      expect(result.status).toBe(200);
      expect(result.messages).toHaveLength(1);
      expect(result.messages![0]).toMatchObject({
        id: 'wamid.reaction123',
        from: '1234567890',
        type: WhatsAppMessageType.REACTION,
        reaction: {
          message_id: 'wamid.original123',
          emoji: '👍'
        },
        phoneNumberId: '123456789',
        businessId: 'PHONE_NUMBER_ID'
      });

      expect(mockHandlers.onReactionMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'wamid.reaction123',
          reaction: {
            message_id: 'wamid.original123',
            emoji: '👍'
          }
        })
      );
    });

    it('should handle reaction messages without handler gracefully', async () => {
      const processorNoHandler = new WebhookProcessor({
        verifyToken: 'test-token',
        handlers: {} // No onReactionMessage handler
      });

      const reactionWebhook = {
        object: 'whatsapp',
        entry: [{
          id: 'PHONE_NUMBER_ID',
          changes: [{
            value: {
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: '123456789'
              },
              messages: [{
                from: '1234567890',
                id: 'wamid.reaction123',
                timestamp: '1640995200',
                type: WhatsAppMessageType.REACTION,
                reaction: {
                  message_id: 'wamid.original123',
                  emoji: '❤️'
                }
              }]
            },
            field: 'messages'
          }]
        }]
      };

      const result = await processorNoHandler.processWebhook(reactionWebhook);

      expect(result.status).toBe(200);
      expect(result.messages).toHaveLength(1);
    });
  });

  describe('Reply Messages', () => {
    it('should process text messages with context (replies) correctly', async () => {
      const replyWebhook = {
        object: 'whatsapp',
        entry: [{
          id: 'PHONE_NUMBER_ID',
          changes: [{
            value: {
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: '123456789'
              },
              messages: [{
                from: '1234567890',
                id: 'wamid.reply123',
                timestamp: '1640995200',
                type: WhatsAppMessageType.TEXT,
                text: { body: 'This is my reply!' },
                context: { message_id: 'wamid.original456' }
              }]
            },
            field: 'messages'
          }]
        }]
      };

      const result = await processor.processWebhook(replyWebhook);

      expect(result.status).toBe(200);
      expect(result.messages).toHaveLength(1);
      expect(result.messages![0]).toMatchObject({
        id: 'wamid.reply123',
        from: '1234567890',
        type: WhatsAppMessageType.TEXT,
        text: 'This is my reply!',
        context: {
          message_id: 'wamid.original456'
        },
        phoneNumberId: '123456789',
        businessId: 'PHONE_NUMBER_ID'
      });

      // Should call both onReplyMessage and onTextMessage
      expect(mockHandlers.onReplyMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'wamid.reply123',
          context: {
            message_id: 'wamid.original456'
          }
        })
      );

      expect(mockHandlers.onTextMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'wamid.reply123',
          text: 'This is my reply!'
        })
      );
    });

    it('should process image replies correctly', async () => {
      const imageReplyWebhook = {
        object: 'whatsapp',
        entry: [{
          id: 'PHONE_NUMBER_ID',
          changes: [{
            value: {
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: '123456789'
              },
              messages: [{
                from: '1234567890',
                id: 'wamid.imagereply123',
                timestamp: '1640995200',
                type: WhatsAppMessageType.IMAGE,
                image: {
                  id: 'media123',
                  mime_type: 'image/jpeg',
                  sha256: 'abcd1234',
                  caption: 'Image reply!'
                },
                context: { message_id: 'wamid.original789' }
              }]
            },
            field: 'messages'
          }]
        }]
      };

      // Add onImageMessage handler
      mockHandlers.onImageMessage = jest.fn();
      processor = new WebhookProcessor({
        verifyToken: 'test-token',
        handlers: mockHandlers
      });

      const result = await processor.processWebhook(imageReplyWebhook);

      expect(result.status).toBe(200);
      expect(result.messages![0]).toMatchObject({
        id: 'wamid.imagereply123',
        type: WhatsAppMessageType.IMAGE,
        context: {
          message_id: 'wamid.original789'
        },
        media: {
          id: 'media123',
          mime_type: 'image/jpeg',
          caption: 'Image reply!'
        }
      });

      expect(mockHandlers.onReplyMessage).toHaveBeenCalled();
      expect(mockHandlers.onImageMessage).toHaveBeenCalled();
    });

    it('should handle messages without context normally', async () => {
      const normalWebhook = {
        object: 'whatsapp',
        entry: [{
          id: 'PHONE_NUMBER_ID',
          changes: [{
            value: {
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: '123456789'
              },
              messages: [{
                from: '1234567890',
                id: 'wamid.normal123',
                timestamp: '1640995200',
                type: WhatsAppMessageType.TEXT,
                text: { body: 'Normal message' }
                // No context field
              }]
            },
            field: 'messages'
          }]
        }]
      };

      const result = await processor.processWebhook(normalWebhook);

      expect(result.status).toBe(200);
      expect(result.messages![0]).toMatchObject({
        id: 'wamid.normal123',
        text: 'Normal message'
      });
      expect(result.messages![0].context).toBeUndefined();

      // Should NOT call onReplyMessage
      expect(mockHandlers.onReplyMessage).not.toHaveBeenCalled();

      // Should call onTextMessage
      expect(mockHandlers.onTextMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Normal message'
        })
      );
    });
  });

  describe('Multiple Messages', () => {
    it('should handle webhooks with both reactions and replies', async () => {
      const mixedWebhook = {
        object: 'whatsapp',
        entry: [{
          id: 'PHONE_NUMBER_ID',
          changes: [{
            value: {
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: '123456789'
              },
              messages: [
                {
                  from: '1234567890',
                  id: 'wamid.reaction1',
                  timestamp: '1640995200',
                  type: WhatsAppMessageType.REACTION,
                  reaction: {
                    message_id: 'wamid.original1',
                    emoji: '😂'
                  }
                },
                {
                  from: '1234567890',
                  id: 'wamid.reply1',
                  timestamp: '1640995201',
                  type: WhatsAppMessageType.TEXT,
                  text: { body: 'Reply message' },
                  context: { message_id: 'wamid.original2' }
                }
              ]
            },
            field: 'messages'
          }]
        }]
      };

      const result = await processor.processWebhook(mixedWebhook);

      expect(result.status).toBe(200);
      expect(result.messages).toHaveLength(2);

      expect(mockHandlers.onReactionMessage).toHaveBeenCalledTimes(1);
      expect(mockHandlers.onReplyMessage).toHaveBeenCalledTimes(1);
      expect(mockHandlers.onTextMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed reaction data gracefully', async () => {
      const malformedWebhook = {
        object: 'whatsapp',
        entry: [{
          id: 'PHONE_NUMBER_ID',
          changes: [{
            value: {
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: '123456789'
              },
              messages: [{
                from: '1234567890',
                id: 'wamid.malformed',
                timestamp: '1640995200',
                type: WhatsAppMessageType.REACTION,
                // reaction field missing to simulate malformed data
              }]
            },
            field: 'messages'
          }]
        }]
      };

      const result = await processor.processWebhook(malformedWebhook);

      expect(result.status).toBe(200);
      expect(result.messages![0].reaction).toBeUndefined();
      expect(mockHandlers.onReactionMessage).not.toHaveBeenCalled();
    });
  });
});