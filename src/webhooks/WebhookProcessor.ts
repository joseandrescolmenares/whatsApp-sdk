import {
  IncomingMessage,
  ProcessedIncomingMessage,
  WebhookProcessorConfig,
  WebhookProcessorResult,
  WhatsAppMessageType
} from '../types';

export class WebhookProcessor {
  private config: WebhookProcessorConfig;

  constructor(config: WebhookProcessorConfig) {
    this.config = config;
  }


  verifyWebhook(mode: string, token: string, challenge: string): number | null {
    if (mode === 'subscribe' && token === this.config.verifyToken) {
      return parseInt(challenge, 10);
    }
    return null;
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

      const messages = this.parseWebhook(body);
      
      if (messages.length > 0) {
        await this.handleMessages(messages);
      }

      return {
        status: 200,
        response: 'OK',
        messages
      };
    } catch (error) {
      if (this.config.handlers.onError) {
        await this.config.handlers.onError(error as Error);
      }
      
      return {
        status: 500,
        response: 'Internal Server Error'
      };
    }
  }


  private parseWebhook(webhook: IncomingMessage): ProcessedIncomingMessage[] {
    const messages: ProcessedIncomingMessage[] = [];

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

            if (message.image || message.video || message.audio || message.document) {
              const mediaType = message.type as keyof typeof message;
              const mediaData = message[mediaType] as any;
              processedMessage.media = {
                id: mediaData.id,
                mime_type: mediaData.mime_type,
                caption: mediaData.caption,
                filename: mediaData.filename
              };
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

            messages.push(processedMessage);
          });
        }
      });
    });

    return messages;
  }


  private async handleMessages(messages: ProcessedIncomingMessage[]): Promise<void> {
    const handlePromises = messages.map(async (message) => {
      try {
        switch (message.type) {
          case WhatsAppMessageType.TEXT:
            if (this.config.handlers.onTextMessage && message.text) {
              await this.config.handlers.onTextMessage(message as ProcessedIncomingMessage & { text: string });
            }
            break;

          case WhatsAppMessageType.IMAGE:
            if (this.config.handlers.onImageMessage && message.media) {
              await this.config.handlers.onImageMessage(message as ProcessedIncomingMessage & { media: NonNullable<ProcessedIncomingMessage['media']> });
            }
            break;

          case WhatsAppMessageType.VIDEO:
            if (this.config.handlers.onVideoMessage && message.media) {
              await this.config.handlers.onVideoMessage(message as ProcessedIncomingMessage & { media: NonNullable<ProcessedIncomingMessage['media']> });
            }
            break;

          case WhatsAppMessageType.AUDIO:
            if (this.config.handlers.onAudioMessage && message.media) {
              await this.config.handlers.onAudioMessage(message as ProcessedIncomingMessage & { media: NonNullable<ProcessedIncomingMessage['media']> });
            }
            break;

          case WhatsAppMessageType.DOCUMENT:
            if (this.config.handlers.onDocumentMessage && message.media) {
              await this.config.handlers.onDocumentMessage(message as ProcessedIncomingMessage & { media: NonNullable<ProcessedIncomingMessage['media']> });
            }
            break;

          case WhatsAppMessageType.LOCATION:
            if (this.config.handlers.onLocationMessage && message.location) {
              await this.config.handlers.onLocationMessage(message as ProcessedIncomingMessage & { location: NonNullable<ProcessedIncomingMessage['location']> });
            }
            break;

          case WhatsAppMessageType.STICKER:
            if (this.config.handlers.onStickerMessage && message.media) {
              await this.config.handlers.onStickerMessage(message as ProcessedIncomingMessage & { media: NonNullable<ProcessedIncomingMessage['media']> });
            }
            break;

          case WhatsAppMessageType.CONTACTS:
            if (this.config.handlers.onContactMessage) {
              await this.config.handlers.onContactMessage(message);
            }
            break;

          case WhatsAppMessageType.INTERACTIVE:
            if (message.interactive) {
              if (message.interactive.button_id && this.config.handlers.onButtonClick) {
                await this.config.handlers.onButtonClick(message as ProcessedIncomingMessage & { interactive: NonNullable<ProcessedIncomingMessage['interactive']> });
              } else if (message.interactive.list_id && this.config.handlers.onListSelect) {
                await this.config.handlers.onListSelect(message as ProcessedIncomingMessage & { interactive: NonNullable<ProcessedIncomingMessage['interactive']> });
              }
            }
            break;

          default:
            if (this.config.handlers.onUnknownMessage) {
              await this.config.handlers.onUnknownMessage(message);
            }
            break;
        }
      } catch (error) {
        if (this.config.handlers.onError) {
          await this.config.handlers.onError(error as Error, message);
        }
      }
    });

    await Promise.all(handlePromises);
  }
}