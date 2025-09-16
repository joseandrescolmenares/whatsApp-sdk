
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';

import {
  WhatsAppConfig,
  OutgoingMessage,
  MessageResponse,
  MediaResponse,
  MediaInfo,
  TextMessage,
  ImageMessage,
  VideoMessage,
  AudioMessage,
  DocumentMessage,
  InteractiveMessage,
  TemplateMessage,
  LocationMessage,
  ContactMessage,
  StickerMessage,
  ReactionMessage,
  ProcessedIncomingMessage,
  IncomingMessage,
  WhatsAppMessageType,
  WebhookHandlers,
  TypingIndicatorMessage,
  ReadReceiptMessage,
  TypingIndicatorResponse,
  ReactionResponse,
  ReactionEmoji,
  REACTION_EMOJIS
} from '../types';

import {
  WhatsAppApiError,
  MediaProcessingError,
  RateLimitError
} from '../errors';

import {
  validateConfig,
  validateMessage,
  validateMediaFile,
  withRetry,
  formatPhoneNumber,
  getFileExtension
} from '../utils';

import { WebhookProcessor } from '../webhooks';

export class WhatsAppClient {
  private readonly config: Required<WhatsAppConfig>;
  private readonly httpClient: AxiosInstance;

  constructor(config: WhatsAppConfig) {
    validateConfig(config);

    this.config = {
      baseUrl: 'https://graph.facebook.com',
      apiVersion: 'v23.0',
      timeout: 30000,
      webhookVerifyToken: '',
      businessId: '',
      ...config
    };

    this.httpClient = axios.create({
      baseURL: `${this.config.baseUrl}/${this.config.apiVersion}`,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.httpClient.interceptors.request.use(
      (config) => {
        (config as any).metadata = { startTime: Date.now() };
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.httpClient.interceptors.response.use(
      (response) => {
        const duration = Date.now() - (response.config as any).metadata.startTime;
        console.log(`WhatsApp API call completed in ${duration}ms`);
        return response;
      },
      (error) => {
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          throw new RateLimitError(
            'Rate limit exceeded',
            retryAfter ? parseInt(retryAfter) : undefined
          );
        }

        const errorData = error.response?.data?.error;
        throw new WhatsAppApiError(
          error.message,
          errorData,
          undefined,
          error.response?.status
        );
      }
    );
  }

  // ========================
  // MESSAGE SENDING METHODS
  // ========================


  async sendMessage(message: OutgoingMessage): Promise<MessageResponse> {
    validateMessage(message);

    const payload = {
      ...message
    };

    try {
      const response = await withRetry(
        () => this.httpClient.post(`/${this.config.phoneNumberId}/messages`, payload),
        { maxRetries: 3 }
      );

      return {
        messageId: response.data.messages[0].id,
        success: true,
        metadata: {
          wamid: response.data.messages[0].id,
          timestamp: Date.now()
        }
      };
    } catch (error: any) {
      throw new WhatsAppApiError(
        `Failed to send ${message.type} message`,
        error.response?.data?.error,
        message,
        error.response?.status
      );
    }
  }

  async sendText(
    to: string,
    text: string,
    options: { previewUrl?: boolean; replyToMessageId?: string } = {}
  ): Promise<MessageResponse> {
    const message: TextMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: WhatsAppMessageType.TEXT,
      to: formatPhoneNumber(to),
      text: {
        body: text,
        preview_url: options.previewUrl || false
      }
    };

    if (options.replyToMessageId) {
      message.context = { message_id: options.replyToMessageId };
    }

    return this.sendMessage(message);
  }

  async sendImage(
    to: string,
    image: { id?: string; link?: string; caption?: string },
    options: { replyToMessageId?: string } = {}
  ): Promise<MessageResponse> {
    const message: ImageMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: WhatsAppMessageType.IMAGE,
      to: formatPhoneNumber(to),
      image
    };

    if (options.replyToMessageId) {
      message.context = { message_id: options.replyToMessageId };
    }

    return this.sendMessage(message);
  }


  async sendVideo(
    to: string,
    video: { id?: string; link?: string; caption?: string },
    options: { replyToMessageId?: string } = {}
  ): Promise<MessageResponse> {
    const message: VideoMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: WhatsAppMessageType.VIDEO,
      to: formatPhoneNumber(to),
      video
    };

    if (options.replyToMessageId) {
      message.context = { message_id: options.replyToMessageId };
    }

    return this.sendMessage(message);
  }

  async sendAudio(
    to: string,
    audio: { id?: string; link?: string },
    options: { replyToMessageId?: string } = {}
  ): Promise<MessageResponse> {
    const message: AudioMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: WhatsAppMessageType.AUDIO,
      to: formatPhoneNumber(to),
      audio
    };

    if (options.replyToMessageId) {
      message.context = { message_id: options.replyToMessageId };
    }

    return this.sendMessage(message);
  }


  async sendDocument(
    to: string,
    document: { id?: string; link?: string; filename: string; caption?: string },
    options: { replyToMessageId?: string } = {}
  ): Promise<MessageResponse> {
    const message: DocumentMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: WhatsAppMessageType.DOCUMENT,
      to: formatPhoneNumber(to),
      document
    };

    if (options.replyToMessageId) {
      message.context = { message_id: options.replyToMessageId };
    }

    return this.sendMessage(message);
  }

  async sendButtons(
    to: string,
    text: string,
    buttons: Array<{ id: string; title: string }>,
    options: {
      header?: { type: 'text'; text: string };
      footer?: string;
      replyToMessageId?: string;
    } = {}
  ): Promise<MessageResponse> {
    const message: InteractiveMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: WhatsAppMessageType.INTERACTIVE,
      to: formatPhoneNumber(to),
      interactive: {
        type: 'button',
        body: { text },
        action: {
          buttons: buttons.map(btn => ({
            type: 'reply' as const,
            reply: { id: btn.id, title: btn.title }
          }))
        }
      }
    };

    if (options.header) {
      message.interactive.header = options.header;
    }

    if (options.footer) {
      message.interactive.footer = { text: options.footer };
    }

    if (options.replyToMessageId) {
      message.context = { message_id: options.replyToMessageId };
    }

    return this.sendMessage(message);
  }

  async sendList(
    to: string,
    text: string,
    buttonText: string,
    sections: Array<{
      title?: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
    options: {
      header?: { type: 'text'; text: string };
      footer?: string;
      replyToMessageId?: string;
    } = {}
  ): Promise<MessageResponse> {
    const message: InteractiveMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: WhatsAppMessageType.INTERACTIVE,
      to: formatPhoneNumber(to),
      interactive: {
        type: 'list',
        body: { text },
        action: {
          button: buttonText,
          sections
        }
      }
    };

    if (options.header) {
      message.interactive.header = options.header;
    }

    if (options.footer) {
      message.interactive.footer = { text: options.footer };
    }

    if (options.replyToMessageId) {
      message.context = { message_id: options.replyToMessageId };
    }

    return this.sendMessage(message);
  }

  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string,
    components?: any[]
  ): Promise<MessageResponse> {
    const message: TemplateMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: WhatsAppMessageType.TEMPLATE,
      to: formatPhoneNumber(to),
      template: {
        name: templateName,
        language: { code: languageCode },
        components
      }
    };

    return this.sendMessage(message);
  }

  async sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    options: {
      name?: string;
      address?: string;
      replyToMessageId?: string;
    } = {}
  ): Promise<MessageResponse> {
    const message: LocationMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: WhatsAppMessageType.LOCATION,
      to: formatPhoneNumber(to),
      location: {
        latitude,
        longitude,
        name: options.name,
        address: options.address
      }
    };

    if (options.replyToMessageId) {
      message.context = { message_id: options.replyToMessageId };
    }

    return this.sendMessage(message);
  }

  async sendContacts(
    to: string,
    contacts: Array<{
      addresses?: Array<{
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
        country_code?: string;
        type?: 'HOME' | 'WORK';
      }>;
      birthday?: string;
      emails?: Array<{
        email?: string;
        type?: 'HOME' | 'WORK';
      }>;
      name: {
        formatted_name: string;
        first_name?: string;
        last_name?: string;
        middle_name?: string;
        suffix?: string;
        prefix?: string;
      };
      org?: {
        company?: string;
        department?: string;
        title?: string;
      };
      phones?: Array<{
        phone?: string;
        wa_id?: string;
        type?: 'HOME' | 'WORK';
      }>;
      urls?: Array<{
        url?: string;
        type?: 'HOME' | 'WORK';
      }>;
    }>,
    options: { replyToMessageId?: string } = {}
  ): Promise<MessageResponse> {
    const message: ContactMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: WhatsAppMessageType.CONTACTS,
      to: formatPhoneNumber(to),
      contacts
    };

    if (options.replyToMessageId) {
      message.context = { message_id: options.replyToMessageId };
    }

    return this.sendMessage(message);
  }

  async sendSticker(
    to: string,
    sticker: { id?: string; link?: string },
    options: { replyToMessageId?: string } = {}
  ): Promise<MessageResponse> {
    const message: StickerMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: WhatsAppMessageType.STICKER,
      to: formatPhoneNumber(to),
      sticker
    };

    if (options.replyToMessageId) {
      message.context = { message_id: options.replyToMessageId };
    }

    return this.sendMessage(message);
  }

  // ========================
  // MEDIA METHODS
  // ========================


  async uploadMedia(
    file: Buffer | string,
    type: 'image' | 'video' | 'audio' | 'document'
  ): Promise<MediaResponse> {
    try {
      if (file instanceof Buffer) {
        validateMediaFile(file, type);
      }

      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      
      if (file instanceof Buffer) {
        const extension = type === 'document' ? 'pdf' : getFileExtension(`${type}/jpeg`);
        formData.append('file', file, `file.${extension}`);
      } else {

        formData.append('file', createReadStream(file));
      }

      const response = await this.httpClient.post(
        `/${this.config.phoneNumberId}/media`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${this.config.accessToken}`
          }
        }
      );

      return {
        id: response.data.id,
        success: true
      };
    } catch (error: any) {
      throw new MediaProcessingError(
        `Failed to upload ${type} media: ${error.message}`
      );
    }
  }

  async getMediaInfo(mediaId: string): Promise<MediaInfo> {
    try {
      const response = await this.httpClient.get(`/${mediaId}`);
      return response.data;
    } catch (error: any) {
      throw new MediaProcessingError(
        `Failed to get media info for ${mediaId}: ${error.message}`,
        mediaId
      );
    }
  }

  async downloadMedia(mediaId: string): Promise<Buffer> {
    try {
      const mediaInfo = await this.getMediaInfo(mediaId);
      
      const response = await this.httpClient.get(mediaInfo.url, {
        responseType: 'arraybuffer'
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      throw new MediaProcessingError(
        `Failed to download media ${mediaId}: ${error.message}`,
        mediaId
      );
    }
  }

  // ========================
  // WEBHOOK METHODS
  // ========================

  verifyWebhook(mode: string, token: string, challenge: string): number | null {
    if (mode === 'subscribe' && token === this.config.webhookVerifyToken) {
      return parseInt(challenge, 10);
    }
    return null;
  }

  parseWebhook(webhook: IncomingMessage): ProcessedIncomingMessage[] {
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

  createWebhookProcessor(handlers: WebhookHandlers): WebhookProcessor {
    return new WebhookProcessor({
      verifyToken: this.config.webhookVerifyToken,
      handlers,
      autoRespond: true
    });
  }

  // ========================
  // TYPING INDICATORS & READ RECEIPTS
  // ========================

  async sendTypingIndicator(to: string, messageId?: string): Promise<TypingIndicatorResponse> {
    try {
      const payload: TypingIndicatorMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formatPhoneNumber(to),
        ...(messageId && { message_id: messageId }),
        typing_indicator: {
          type: 'text'
        }
      };

      await withRetry(async () => {
        await this.httpClient.post(`/${this.config.phoneNumberId}/messages`, payload);
      }, { maxRetries: 1, initialDelay: 100 });

      return {
        success: true,
        messageId: undefined // Typing indicators don't return message IDs
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send typing indicator'
      };
    }
  }

  async markMessageAsRead(messageId: string): Promise<TypingIndicatorResponse> {
    try {
      const payload: ReadReceiptMessage = {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      };

      await withRetry(async () => {
        await this.httpClient.post(`/${this.config.phoneNumberId}/messages`, payload);
      }, { maxRetries: 1, initialDelay: 100 });

      return {
        success: true,
        messageId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark message as read'
      };
    }
  }

  async sendTypingIndicatorWithDuration(to: string, durationMs: number = 15000, messageId?: string): Promise<TypingIndicatorResponse> {
    const maxDuration = 25000; // WhatsApp max is 25 seconds
    const safeDuration = Math.min(durationMs, maxDuration);

    try {
      // Send typing indicator
      const result = await this.sendTypingIndicator(to, messageId);
      
      if (!result.success) {
        return result;
      }

      // Auto-clear after specified duration
      const timeout = setTimeout(() => {
        // In a real implementation, you might want to send a "stop typing" indicator
        // For now, we'll just log that the typing indicator expired
        console.debug(`Typing indicator for ${to} expired after ${safeDuration}ms`);
      }, safeDuration);
      
      // Don't keep the process alive for this timeout
      timeout.unref();

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send typing indicator with duration'
      };
    }
  }

  // ========================
  // CONTEXTUAL REPLY METHODS
  // ========================

  async replyToMessage(
    to: string,
    messageId: string,
    text: string,
    options: { previewUrl?: boolean } = {}
  ): Promise<MessageResponse> {
    return this.sendText(to, text, {
      ...options,
      replyToMessageId: messageId
    });
  }

  async replyWithImage(
    to: string,
    messageId: string,
    image: { id?: string; link?: string; caption?: string }
  ): Promise<MessageResponse> {
    return this.sendImage(to, image, {
      replyToMessageId: messageId
    });
  }

  async replyWithVideo(
    to: string,
    messageId: string,
    video: { id?: string; link?: string; caption?: string }
  ): Promise<MessageResponse> {
    return this.sendVideo(to, video, {
      replyToMessageId: messageId
    });
  }

  async replyWithAudio(
    to: string,
    messageId: string,
    audio: { id?: string; link?: string }
  ): Promise<MessageResponse> {
    return this.sendAudio(to, audio, {
      replyToMessageId: messageId
    });
  }

  async replyWithDocument(
    to: string,
    messageId: string,
    document: { id?: string; link?: string; caption?: string; filename: string }
  ): Promise<MessageResponse> {
    return this.sendDocument(to, document, {
      replyToMessageId: messageId
    });
  }

  async replyWithButtons(
    to: string,
    messageId: string,
    text: string,
    buttons: Array<{ id: string; title: string }>,
    options: {
      header?: { type: 'text'; text: string };
      footer?: string;
    } = {}
  ): Promise<MessageResponse> {
    return this.sendButtons(to, text, buttons, {
      ...options,
      replyToMessageId: messageId
    });
  }

  async replyWithList(
    to: string,
    messageId: string,
    text: string,
    buttonText: string,
    sections: Array<{
      title?: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>
  ): Promise<MessageResponse> {
    return this.sendList(to, text, buttonText, sections, {
      replyToMessageId: messageId
    });
  }

  async replyWithLocation(
    to: string,
    messageId: string,
    latitude: number,
    longitude: number,
    options: { name?: string; address?: string } = {}
  ): Promise<MessageResponse> {
    return this.sendLocation(to, latitude, longitude, {
      ...options,
      replyToMessageId: messageId
    });
  }

  async replyWithContacts(
    to: string,
    messageId: string,
    contacts: Array<any>
  ): Promise<MessageResponse> {
    return this.sendContacts(to, contacts, {
      replyToMessageId: messageId
    });
  }

  async replyWithSticker(
    to: string,
    messageId: string,
    sticker: { id?: string; link?: string }
  ): Promise<MessageResponse> {
    return this.sendSticker(to, sticker, {
      replyToMessageId: messageId
    });
  }

  // ========================
  // REACTION METHODS
  // ========================

  async sendReaction(
    to: string,
    messageId: string,
    emoji: ReactionEmoji
  ): Promise<ReactionResponse> {
    try {
      const message: ReactionMessage = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        type: WhatsAppMessageType.REACTION,
        to: formatPhoneNumber(to),
        reaction: {
          message_id: messageId,
          emoji
        }
      };

      await withRetry(async () => {
        await this.httpClient.post(`/${this.config.phoneNumberId}/messages`, message);
      }, { maxRetries: 1, initialDelay: 100 });

      return {
        success: true,
        messageId: undefined // Reactions don't return message IDs in the response
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send reaction'
      };
    }
  }

  async reactToMessage(
    to: string,
    messageId: string,
    emoji: ReactionEmoji
  ): Promise<ReactionResponse> {
    return this.sendReaction(to, messageId, emoji);
  }

  // Convenience methods for common emojis
  async reactWithLike(to: string, messageId: string): Promise<ReactionResponse> {
    return this.sendReaction(to, messageId, REACTION_EMOJIS.LIKE);
  }

  async reactWithLove(to: string, messageId: string): Promise<ReactionResponse> {
    return this.sendReaction(to, messageId, REACTION_EMOJIS.LOVE);
  }

  async reactWithLaugh(to: string, messageId: string): Promise<ReactionResponse> {
    return this.sendReaction(to, messageId, REACTION_EMOJIS.LAUGH);
  }

  async reactWithWow(to: string, messageId: string): Promise<ReactionResponse> {
    return this.sendReaction(to, messageId, REACTION_EMOJIS.WOW);
  }

  async reactWithSad(to: string, messageId: string): Promise<ReactionResponse> {
    return this.sendReaction(to, messageId, REACTION_EMOJIS.SAD);
  }

  async reactWithAngry(to: string, messageId: string): Promise<ReactionResponse> {
    return this.sendReaction(to, messageId, REACTION_EMOJIS.ANGRY);
  }

  async reactWithThumbsUp(to: string, messageId: string): Promise<ReactionResponse> {
    return this.sendReaction(to, messageId, REACTION_EMOJIS.THUMBS_UP);
  }

  async reactWithThumbsDown(to: string, messageId: string): Promise<ReactionResponse> {
    return this.sendReaction(to, messageId, REACTION_EMOJIS.THUMBS_DOWN);
  }

  async reactWithHeart(to: string, messageId: string): Promise<ReactionResponse> {
    return this.sendReaction(to, messageId, REACTION_EMOJIS.HEART);
  }

  async reactWithHeartEyes(to: string, messageId: string): Promise<ReactionResponse> {
    return this.sendReaction(to, messageId, REACTION_EMOJIS.HEART_EYES);
  }

  async reactWithFire(to: string, messageId: string): Promise<ReactionResponse> {
    return this.sendReaction(to, messageId, REACTION_EMOJIS.FIRE);
  }

  async reactWithClap(to: string, messageId: string): Promise<ReactionResponse> {
    return this.sendReaction(to, messageId, REACTION_EMOJIS.CLAP);
  }

  async reactWithCheck(to: string, messageId: string): Promise<ReactionResponse> {
    return this.sendReaction(to, messageId, REACTION_EMOJIS.CHECK);
  }

  async reactWithCross(to: string, messageId: string): Promise<ReactionResponse> {
    return this.sendReaction(to, messageId, REACTION_EMOJIS.CROSS);
  }

  // Remove reaction (send empty emoji)
  async removeReaction(to: string, messageId: string): Promise<ReactionResponse> {
    return this.sendReaction(to, messageId, '');
  }

  // ========================
  // UTILITY METHODS
  // ========================

  getConfig(): Partial<WhatsAppConfig> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    const { accessToken: _, ...safeConfig } = this.config;
    return {
      ...safeConfig,
      accessToken: '***'
    };
  }


  async testConnection(): Promise<boolean> {
    try {
      await this.httpClient.get(`/${this.config.phoneNumberId}`);
      return true;
    } catch {
      return false;
    }
  }
}