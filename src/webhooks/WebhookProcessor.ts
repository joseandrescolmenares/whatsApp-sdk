import {
  IncomingMessage,
  ProcessedIncomingMessage,
  MessageStatusUpdate,
  WebhookProcessorConfig,
  WebhookProcessorResult,
  WhatsAppMessageType,
  MessageStatus,
  MessageBuffer
} from '../types';

import {
  WebhookProcessingError,
  BufferError,
  ErrorContext
} from '../errors';

import { StorageManager } from '../storage';

export class WebhookProcessor {
  private config: WebhookProcessorConfig;
  private messageBuffers: Map<string, MessageBuffer> = new Map();
  private storage?: StorageManager;
  private activeTimers: Set<NodeJS.Timeout> = new Set();

  constructor(config: WebhookProcessorConfig, storage?: StorageManager) {
    this.config = {
      bufferTimeMs: 5000,
      maxBatchSize: 100,
      ...config
    };
    this.storage = storage;
  }


  verifyWebhook(mode: string, token: string, challenge: string): number | null {
    if (mode === 'subscribe' && token === this.config.verifyToken) {
      return parseInt(challenge, 10);
    }
    return null;
  }

  destroy(): void {
    this.activeTimers.forEach(timer => clearTimeout(timer));
    this.activeTimers.clear();

    this.messageBuffers.forEach(buffer => clearTimeout(buffer.timer));
    this.messageBuffers.clear();
  }


  async processWebhook(
    body: IncomingMessage,
    query?: { [key: string]: string }
  ): Promise<WebhookProcessorResult> {
    try {
      if (query && query['hub.mode'] && query['hub.verify_token'] && query['hub.challenge']) {
        const result = this.verifyWebhook(
          query['hub.mode'],
          query['hub.verify_token'],
          query['hub.challenge']
        );
        
        if (result !== null) {
          return { status: 200, response: result };
        } else {
          return { status: 403, response: 'Forbidden' };
        }
      }

      const { messages, statusUpdates } = this.parseWebhook(body);

      if (messages.length > 0) {
        if (this.config.enableBuffer) {
          await this.handleMessagesWithBuffer(messages);
        } else {
          await this.handleMessages(messages);
        }
      }

      if (statusUpdates.length > 0) {
        await this.handleStatusUpdates(statusUpdates);
      }

      return {
        status: 200,
        response: 'OK',
        messages,
        statusUpdates
      };
    } catch (error) {
      const enhancedError = this.createEnhancedError(error, 'webhook_processing');

      if (this.config.handlers.onError) {
        await this.config.handlers.onError(enhancedError);
      }

      return {
        status: 500,
        response: enhancedError.message
      };
    }
  }


  private parseWebhook(webhook: IncomingMessage): { messages: ProcessedIncomingMessage[], statusUpdates: MessageStatusUpdate[] } {
    const messages: ProcessedIncomingMessage[] = [];
    const statusUpdates: MessageStatusUpdate[] = [];

    webhook.entry?.forEach(entry => {
      entry.changes?.forEach(change => {
        const value = change.value;
        
        if (value.messages) {
          value.messages.forEach(message => {
            const contact = value.contacts?.[0];
            
            const processedMessage: ProcessedIncomingMessage = {
              id: message.id,
              from: message.from,
              timestamp: message.timestamp,
              type: message.type,
              phoneNumberId: value.metadata.phone_number_id,
              businessId: entry.id
            };

            if (message.text) {
              processedMessage.text = message.text.body;
            }

            if (message.image || message.video || message.audio || message.document || message.sticker) {
              const mediaData = message.image || message.video || message.audio || message.document || message.sticker;
              if (mediaData) {
                processedMessage.media = {
                  id: mediaData.id,
                  mime_type: mediaData.mime_type,
                  caption: 'caption' in mediaData ? mediaData.caption as string | undefined : undefined,
                  filename: 'filename' in mediaData ? mediaData.filename as string | undefined : undefined
                };
              }
            }

            if (message.location) {
              processedMessage.location = message.location;
            }

            if (message.interactive) {
              processedMessage.interactive = {
                type: message.interactive.type,
                button_id: message.interactive.button_reply?.id,
                list_id: message.interactive.list_reply?.id,
                flow_response: message.interactive.nfm_reply?.response_json
              };
            }

            if (contact) {
              processedMessage.contact = {
                name: contact.profile.name
              };
            }

            if (message.reaction) {
              processedMessage.reaction = {
                message_id: message.reaction.message_id,
                emoji: message.reaction.emoji
              };
            }

            if (message.context) {
              processedMessage.context = {
                message_id: message.context.message_id
              };
            }

            messages.push(processedMessage);
          });
        }

        if (value.statuses) {
          value.statuses.forEach(status => {
            const statusUpdate: MessageStatusUpdate = {
              id: status.id,
              status: status.status as MessageStatus,
              timestamp: status.timestamp,
              recipient_id: status.recipient_id,
              phoneNumberId: value.metadata.phone_number_id,
              businessId: entry.id,
              conversation: status.conversation,
              pricing: status.pricing,
              errors: status.errors
            };

            statusUpdates.push(statusUpdate);
          });
        }
      });
    });

    return { messages, statusUpdates };
  }


  private async handleMessagesWithBuffer(messages: ProcessedIncomingMessage[]): Promise<void> {
    for (const message of messages) {
      const phoneNumber = message.from;

      try {
        if (this.messageBuffers.has(phoneNumber)) {
          const buffer = this.messageBuffers.get(phoneNumber)!;

          if (buffer.messages.length >= (this.config.maxBatchSize! * 2)) {
            throw this.createBufferError(phoneNumber,
              `Buffer overflow detected. Buffer size: ${buffer.messages.length}, max allowed: ${this.config.maxBatchSize! * 2}`,
              { messageId: message.id, additionalData: { bufferSize: buffer.messages.length } }
            );
          }

          buffer.messages.push(message);
          clearTimeout(buffer.timer);
          this.activeTimers.delete(buffer.timer);

          if (buffer.messages.length >= this.config.maxBatchSize!) {
            await this.processBufferedMessages(phoneNumber);
          } else {
            buffer.timer = this.createBufferTimer(phoneNumber);
          }
        } else {
          const buffer: MessageBuffer = {
            messages: [message],
            timer: this.createBufferTimer(phoneNumber),
            firstMessageTime: Date.now()
          };
          this.messageBuffers.set(phoneNumber, buffer);
        }
      } catch (error) {
        if (this.config.handlers.onError) {
          const bufferError = error instanceof BufferError ? error :
            this.createBufferError(phoneNumber, error, { messageId: message.id });
          await this.config.handlers.onError(bufferError);
        }
      }
    }
  }

  private createBufferTimer(phoneNumber: string): NodeJS.Timeout {
    const timer = setTimeout(async () => {
      this.activeTimers.delete(timer);
      try {
        await this.processBufferedMessages(phoneNumber);
      } catch (error) {
        if (this.config.handlers.onError) {
          const bufferError = this.createBufferError(phoneNumber, error,
            { additionalData: { source: 'buffer_timer' } }
          );
          await this.config.handlers.onError(bufferError);
        }
      }
    }, this.config.bufferTimeMs!);

    this.activeTimers.add(timer);
    return timer;
  }

  private async processBufferedMessages(phoneNumber: string): Promise<void> {
    const buffer = this.messageBuffers.get(phoneNumber);
    if (!buffer) return;

    const messages = buffer.messages;
    clearTimeout(buffer.timer);
    this.activeTimers.delete(buffer.timer);
    this.messageBuffers.delete(phoneNumber);

    await this.handleMessages(messages);
  }

  private async handleMessages(messages: ProcessedIncomingMessage[]): Promise<void> {
    try {
      if (this.storage?.isEnabled() && this.storage.isFeatureEnabled('persistIncoming')) {
        try {
          if (messages.length === 1) {
            await this.storage.saveMessage(messages[0]);
          } else {
            await this.storage.bulkSaveMessages(messages);
          }
        } catch (storageError) {
          if (process.env.DEBUG?.includes('whatsapp-sdk') || process.env.NODE_ENV !== 'production') {
            console.warn('Failed to persist incoming messages:', storageError instanceof Error ? storageError.message : String(storageError));
          }
        }
      }

      const replyMessages = messages.filter(msg => msg.context);
      if (replyMessages.length > 0 && this.config.handlers.onReplyMessage) {
        const typedReplyMessages = replyMessages as (ProcessedIncomingMessage & { context: NonNullable<ProcessedIncomingMessage['context']> })[];
        if (this.config.enableBuffer && typedReplyMessages.length > 1) {
          await this.config.handlers.onReplyMessage(typedReplyMessages);
        } else {
          for (const message of typedReplyMessages) {
            await this.config.handlers.onReplyMessage(message);
          }
        }
      }

      const messagesByType = new Map<WhatsAppMessageType, ProcessedIncomingMessage[]>();

      for (const message of messages) {
        if (!messagesByType.has(message.type)) {
          messagesByType.set(message.type, []);
        }
        messagesByType.get(message.type)!.push(message);
      }

      for (const [type, typeMessages] of messagesByType) {
        await this.handleMessagesByType(type, typeMessages);
      }
    } catch (error) {
      if (this.config.handlers.onError) {
        const enhancedError = this.createEnhancedError(error, 'message_handling', {
          additionalData: {
            messageCount: messages.length,
            messageTypes: [...new Set(messages.map(m => m.type))]
          }
        });
        await this.config.handlers.onError(enhancedError);
      }
    }
  }

  private async handleMessagesByType(type: WhatsAppMessageType, messages: ProcessedIncomingMessage[]): Promise<void> {
    const isBufferEnabled = this.config.enableBuffer && messages.length > 1;

    switch (type) {
      case WhatsAppMessageType.TEXT:
        if (this.config.handlers.onTextMessage) {
          const textMessages = messages.filter(msg => msg.text) as (ProcessedIncomingMessage & { text: string })[];
          if (textMessages.length > 0) {
            if (isBufferEnabled) {
              await this.config.handlers.onTextMessage(textMessages);
            } else {
              for (const message of textMessages) {
                await this.config.handlers.onTextMessage(message);
              }
            }
          }
        }
        break;

      case WhatsAppMessageType.IMAGE:
        if (this.config.handlers.onImageMessage) {
          const imageMessages = messages.filter(msg => msg.media) as (ProcessedIncomingMessage & { media: NonNullable<ProcessedIncomingMessage['media']> })[];
          if (imageMessages.length > 0) {
            if (isBufferEnabled) {
              await this.config.handlers.onImageMessage(imageMessages);
            } else {
              for (const message of imageMessages) {
                await this.config.handlers.onImageMessage(message);
              }
            }
          }
        }
        break;

      case WhatsAppMessageType.VIDEO:
        if (this.config.handlers.onVideoMessage) {
          const videoMessages = messages.filter(msg => msg.media) as (ProcessedIncomingMessage & { media: NonNullable<ProcessedIncomingMessage['media']> })[];
          if (videoMessages.length > 0) {
            if (isBufferEnabled) {
              await this.config.handlers.onVideoMessage(videoMessages);
            } else {
              for (const message of videoMessages) {
                await this.config.handlers.onVideoMessage(message);
              }
            }
          }
        }
        break;

      case WhatsAppMessageType.AUDIO:
        if (this.config.handlers.onAudioMessage) {
          const audioMessages = messages.filter(msg => msg.media) as (ProcessedIncomingMessage & { media: NonNullable<ProcessedIncomingMessage['media']> })[];
          if (audioMessages.length > 0) {
            if (isBufferEnabled) {
              await this.config.handlers.onAudioMessage(audioMessages);
            } else {
              for (const message of audioMessages) {
                await this.config.handlers.onAudioMessage(message);
              }
            }
          }
        }
        break;

      case WhatsAppMessageType.DOCUMENT:
        if (this.config.handlers.onDocumentMessage) {
          const documentMessages = messages.filter(msg => msg.media) as (ProcessedIncomingMessage & { media: NonNullable<ProcessedIncomingMessage['media']> })[];
          if (documentMessages.length > 0) {
            if (isBufferEnabled) {
              await this.config.handlers.onDocumentMessage(documentMessages);
            } else {
              for (const message of documentMessages) {
                await this.config.handlers.onDocumentMessage(message);
              }
            }
          }
        }
        break;

      case WhatsAppMessageType.LOCATION:
        if (this.config.handlers.onLocationMessage) {
          const locationMessages = messages.filter(msg => msg.location) as (ProcessedIncomingMessage & { location: NonNullable<ProcessedIncomingMessage['location']> })[];
          if (locationMessages.length > 0) {
            if (isBufferEnabled) {
              await this.config.handlers.onLocationMessage(locationMessages);
            } else {
              for (const message of locationMessages) {
                await this.config.handlers.onLocationMessage(message);
              }
            }
          }
        }
        break;

      case WhatsAppMessageType.STICKER:
        if (this.config.handlers.onStickerMessage) {
          const stickerMessages = messages.filter(msg => msg.media) as (ProcessedIncomingMessage & { media: NonNullable<ProcessedIncomingMessage['media']> })[];
          if (stickerMessages.length > 0) {
            if (isBufferEnabled) {
              await this.config.handlers.onStickerMessage(stickerMessages);
            } else {
              for (const message of stickerMessages) {
                await this.config.handlers.onStickerMessage(message);
              }
            }
          }
        }
        break;

      case WhatsAppMessageType.CONTACTS:
        if (this.config.handlers.onContactMessage) {
          if (isBufferEnabled) {
            await this.config.handlers.onContactMessage(messages);
          } else {
            for (const message of messages) {
              await this.config.handlers.onContactMessage(message);
            }
          }
        }
        break;

      case WhatsAppMessageType.INTERACTIVE: {
        const buttonMessages = messages.filter(msg => msg.interactive?.button_id) as (ProcessedIncomingMessage & { interactive: NonNullable<ProcessedIncomingMessage['interactive']> })[];
        const listMessages = messages.filter(msg => msg.interactive?.list_id) as (ProcessedIncomingMessage & { interactive: NonNullable<ProcessedIncomingMessage['interactive']> })[];

        if (buttonMessages.length > 0 && this.config.handlers.onButtonClick) {
          if (isBufferEnabled) {
            await this.config.handlers.onButtonClick(buttonMessages);
          } else {
            for (const message of buttonMessages) {
              await this.config.handlers.onButtonClick(message);
            }
          }
        }

        if (listMessages.length > 0 && this.config.handlers.onListSelect) {
          if (isBufferEnabled) {
            await this.config.handlers.onListSelect(listMessages);
          } else {
            for (const message of listMessages) {
              await this.config.handlers.onListSelect(message);
            }
          }
        }
        break;
      }

      case WhatsAppMessageType.REACTION:
        if (this.config.handlers.onReactionMessage) {
          const reactionMessages = messages.filter(msg => msg.reaction) as (ProcessedIncomingMessage & { reaction: NonNullable<ProcessedIncomingMessage['reaction']> })[];
          if (reactionMessages.length > 0) {
            if (isBufferEnabled) {
              await this.config.handlers.onReactionMessage(reactionMessages);
            } else {
              for (const message of reactionMessages) {
                await this.config.handlers.onReactionMessage(message);
              }
            }
          }
        }
        break;

      default:
        if (this.config.handlers.onUnknownMessage) {
          if (isBufferEnabled) {
            await this.config.handlers.onUnknownMessage(messages);
          } else {
            for (const message of messages) {
              await this.config.handlers.onUnknownMessage(message);
            }
          }
        }
        break;
    }
  }

  private async handleStatusUpdates(statusUpdates: MessageStatusUpdate[]): Promise<void> {
    if (this.storage?.isEnabled() && this.storage.isFeatureEnabled('persistStatus')) {
      try {
        const statusUpdatePromises = statusUpdates.map(async (statusUpdate) => {
          await this.storage!.updateMessageStatus(statusUpdate.id, statusUpdate.status);
        });
        await Promise.all(statusUpdatePromises);
      } catch (storageError) {
        if (process.env.DEBUG?.includes('whatsapp-sdk') || process.env.NODE_ENV !== 'production') {
          console.warn('Failed to persist status updates:', storageError instanceof Error ? storageError.message : String(storageError));
        }
      }
    }

    const handlePromises = statusUpdates.map(async (statusUpdate) => {
      try {
        if (this.config.handlers.onMessageStatusUpdate) {
          await this.config.handlers.onMessageStatusUpdate(statusUpdate);
        }
      } catch (error) {
        if (this.config.handlers.onError) {
          const enhancedError = this.createEnhancedError(error, 'status_update_handling', {
            additionalData: {
              statusUpdateId: statusUpdate.id,
              status: statusUpdate.status,
              recipientId: statusUpdate.recipient_id
            }
          });
          await this.config.handlers.onError(enhancedError);
        }
      }
    });

    await Promise.all(handlePromises);
  }

  private createEnhancedError(error: unknown, operation: string, context: Partial<ErrorContext> = {}): WebhookProcessingError {
    const originalError = error instanceof Error ? error : new Error(String(error));

    return new WebhookProcessingError(
      `Failed during ${operation}: ${originalError.message}`,
      {
        operation,
        timestamp: Date.now(),
        ...context
      },
      originalError
    );
  }

  private createBufferError(phoneNumber: string, error: unknown, context: Partial<ErrorContext> = {}): BufferError {
    const originalError = error instanceof Error ? error : new Error(String(error));

    return new BufferError(
      `Buffer processing failed for ${phoneNumber}: ${originalError.message}`,
      {
        operation: 'message_buffering',
        phoneNumber,
        timestamp: Date.now(),
        ...context
      },
      originalError
    );
  }
}