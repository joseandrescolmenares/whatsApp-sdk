import { WebhookProcessor } from '../src/webhooks/WebhookProcessor';
import { MessageStatus, WhatsAppMessageType } from '../src/types';

describe('WebhookProcessor - Status Updates', () => {
  let processor: WebhookProcessor;
  let mockHandlers: any;

  beforeEach(() => {
    mockHandlers = {
      onMessageStatusUpdate: jest.fn(),
      onError: jest.fn()
    };

    processor = new WebhookProcessor({
      verifyToken: 'test-token',
      handlers: mockHandlers
    });
  });

  describe('Message Status Updates', () => {
    it('should process message read status correctly', async () => {
      const readStatusWebhook = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [{
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: '123456789'
              },
              statuses: [{
                id: 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJCMTE4RTUA',
                status: 'read',
                timestamp: '1640995200',
                recipient_id: '1234567890'
              }]
            }
          }]
        }]
      };

      const result = await processor.processWebhook(readStatusWebhook);

      expect(result.status).toBe(200);
      expect(result.statusUpdates).toHaveLength(1);
      expect(result.statusUpdates![0]).toMatchObject({
        id: 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJCMTE4RTUA',
        status: MessageStatus.READ,
        timestamp: '1640995200',
        recipient_id: '1234567890',
        phoneNumberId: '123456789',
        businessId: 'WHATSAPP_BUSINESS_ACCOUNT_ID'
      });

      expect(mockHandlers.onMessageStatusUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJCMTE4RTUA',
          status: MessageStatus.READ
        })
      );
    });

    it('should process message delivered status correctly', async () => {
      const deliveredStatusWebhook = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [{
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: '123456789'
              },
              statuses: [{
                id: 'wamid.delivered123',
                status: 'delivered',
                timestamp: '1640995100',
                recipient_id: '1234567890'
              }]
            }
          }]
        }]
      };

      const result = await processor.processWebhook(deliveredStatusWebhook);

      expect(result.status).toBe(200);
      expect(result.statusUpdates).toHaveLength(1);
      expect(result.statusUpdates![0].status).toBe(MessageStatus.DELIVERED);

      expect(mockHandlers.onMessageStatusUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: MessageStatus.DELIVERED
        })
      );
    });

    it('should process message sent status correctly', async () => {
      const sentStatusWebhook = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [{
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: '123456789'
              },
              statuses: [{
                id: 'wamid.sent123',
                status: 'sent',
                timestamp: '1640995000',
                recipient_id: '1234567890'
              }]
            }
          }]
        }]
      };

      const result = await processor.processWebhook(sentStatusWebhook);

      expect(result.statusUpdates![0].status).toBe(MessageStatus.SENT);
    });

    it('should process message failed status with error details', async () => {
      const failedStatusWebhook = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [{
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: '123456789'
              },
              statuses: [{
                id: 'wamid.failed123',
                status: 'failed',
                timestamp: '1640995000',
                recipient_id: '1234567890',
                errors: [{
                  code: 131047,
                  title: 'Re-engagement message',
                  message: 'More than 24 hours have passed since the customer last replied to this number.',
                  error_data: {
                    details: 'Message failed to send because more than 24 hours have passed since the customer last replied to this number.'
                  }
                }]
              }]
            }
          }]
        }]
      };

      const result = await processor.processWebhook(failedStatusWebhook);

      expect(result.statusUpdates![0]).toMatchObject({
        status: MessageStatus.FAILED,
        errors: [{
          code: 131047,
          title: 'Re-engagement message',
          message: 'More than 24 hours have passed since the customer last replied to this number.'
        }]
      });
    });

    it('should process status with pricing information', async () => {
      const statusWithPricingWebhook = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [{
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: '123456789'
              },
              statuses: [{
                id: 'wamid.pricing123',
                status: 'delivered',
                timestamp: '1640995000',
                recipient_id: '1234567890',
                conversation: {
                  id: 'conversation123',
                  origin: {
                    type: 'business_initiated'
                  }
                },
                pricing: {
                  pricing_model: 'CBP',
                  billable: true,
                  category: 'business_initiated'
                }
              }]
            }
          }]
        }]
      };

      const result = await processor.processWebhook(statusWithPricingWebhook);

      expect(result.statusUpdates![0]).toMatchObject({
        conversation: {
          id: 'conversation123',
          origin: { type: 'business_initiated' }
        },
        pricing: {
          pricing_model: 'CBP',
          billable: true,
          category: 'business_initiated'
        }
      });
    });

    it('should handle multiple status updates in one webhook', async () => {
      const multipleStatusWebhook = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [{
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: '123456789'
              },
              statuses: [
                {
                  id: 'wamid.sent123',
                  status: 'sent',
                  timestamp: '1640995000',
                  recipient_id: '1234567890'
                },
                {
                  id: 'wamid.delivered123',
                  status: 'delivered',
                  timestamp: '1640995100',
                  recipient_id: '1234567890'
                },
                {
                  id: 'wamid.read123',
                  status: 'read',
                  timestamp: '1640995200',
                  recipient_id: '1234567890'
                }
              ]
            }
          }]
        }]
      };

      const result = await processor.processWebhook(multipleStatusWebhook);

      expect(result.statusUpdates).toHaveLength(3);
      expect(mockHandlers.onMessageStatusUpdate).toHaveBeenCalledTimes(3);

      expect(result.statusUpdates![0].status).toBe(MessageStatus.SENT);
      expect(result.statusUpdates![1].status).toBe(MessageStatus.DELIVERED);
      expect(result.statusUpdates![2].status).toBe(MessageStatus.READ);
    });

    it('should handle webhooks with both messages and status updates', async () => {
      const mixedWebhook = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [{
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: '123456789'
              },
              messages: [{
                from: '1234567890',
                id: 'wamid.incoming123',
                timestamp: '1640995300',
                type: WhatsAppMessageType.TEXT,
                text: { body: 'Hello!' }
              }],
              statuses: [{
                id: 'wamid.read123',
                status: 'read',
                timestamp: '1640995200',
                recipient_id: '1234567890'
              }]
            }
          }]
        }]
      };

      // Add text message handler for this test
      mockHandlers.onTextMessage = jest.fn();
      processor = new WebhookProcessor({
        verifyToken: 'test-token',
        handlers: mockHandlers
      });

      const result = await processor.processWebhook(mixedWebhook);

      expect(result.messages).toHaveLength(1);
      expect(result.statusUpdates).toHaveLength(1);

      expect(mockHandlers.onTextMessage).toHaveBeenCalledTimes(1);
      expect(mockHandlers.onMessageStatusUpdate).toHaveBeenCalledTimes(1);
    });

    it('should handle status updates without handler gracefully', async () => {
      const processorNoHandler = new WebhookProcessor({
        verifyToken: 'test-token',
        handlers: {} // No onMessageStatusUpdate handler
      });

      const statusWebhook = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [{
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: '123456789'
              },
              statuses: [{
                id: 'wamid.test123',
                status: 'read',
                timestamp: '1640995200',
                recipient_id: '1234567890'
              }]
            }
          }]
        }]
      };

      const result = await processorNoHandler.processWebhook(statusWebhook);

      expect(result.status).toBe(200);
      expect(result.statusUpdates).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle status update processing errors', async () => {
      mockHandlers.onMessageStatusUpdate = jest.fn().mockRejectedValue(new Error('Processing error'));

      const statusWebhook = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [{
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+1234567890',
                phone_number_id: '123456789'
              },
              statuses: [{
                id: 'wamid.error123',
                status: 'read',
                timestamp: '1640995200',
                recipient_id: '1234567890'
              }]
            }
          }]
        }]
      };

      const result = await processor.processWebhook(statusWebhook);

      expect(result.status).toBe(200);
      expect(mockHandlers.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Processing error' })
      );
    });
  });
});