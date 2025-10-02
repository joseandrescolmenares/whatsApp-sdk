
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
  WebhookHandlersWithBuffer,
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
  ApiRequestError,
  WhatsAppErrorCode,
  ErrorContext
} from '../errors';

import {
  validateConfig,
  validateMessage,
  validateMediaFile,
  validateStorageConfig,
  withRetry,
  formatPhoneNumber,
  getFileExtension
} from '../utils';

import { WebhookProcessor } from '../webhooks';
import { StorageManager } from '../storage';
import { BroadcastManager } from '../broadcast/BroadcastManager';
import type {
  BroadcastRecipient,
  BroadcastOptions,
  BroadcastResult
} from '../types';

export class WhatsAppClient {
  private readonly config: Required<Omit<WhatsAppConfig, 'storage'>> & { storage?: any };
  private readonly httpClient: AxiosInstance;
  public readonly storage: StorageManager;
  private broadcastManager: BroadcastManager;

  constructor(config: WhatsAppConfig) {
    validateConfig(config);

    if (config.storage) {
      validateStorageConfig(config.storage);
    }

    this.config = {
      baseUrl: 'https://graph.facebook.com',
      apiVersion: 'v23.0',
      timeout: 30000,
      webhookVerifyToken: '',
      businessId: '',
      ...config
    };

    this.storage = config.storage
      ? new StorageManager(config.storage)
      : StorageManager.createDisabled();

    this.httpClient = axios.create({
      baseURL: `${this.config.baseUrl}/${this.config.apiVersion}`,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    this.broadcastManager = new BroadcastManager(this);

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
        if (process.env.DEBUG?.includes('whatsapp-sdk')) {
          console.log(`WhatsApp API call completed in ${duration}ms`);
        }
        return response;
      },
      (error) => {
        const status = error.response?.status || 0;
        const errorData = error.response?.data?.error;
        const context: Partial<ErrorContext> = {
          timestamp: Date.now(),
          operation: 'api_request',
          requestId: error.response?.headers['x-fb-trace-id'] || error.response?.headers['x-request-id'],
          additionalData: {
            url: error.config?.url,
            method: error.config?.method?.toUpperCase(),
            status,
            statusText: error.response?.statusText
          }
        };

        if (status === 429) {
          throw new ApiRequestError(
            'Rate limit exceeded. Please reduce your request frequency.',
            status,
            WhatsAppErrorCode.RATE_LIMIT_EXCEEDED,
            context,
            error.response?.data,
            error
          );
        }

        let errorCode: WhatsAppErrorCode;
        let message: string;

        switch (status) {
          case 401:
            errorCode = WhatsAppErrorCode.MISSING_ACCESS_TOKEN;
            message = 'Authentication failed. Please check your access token.';
            break;
          case 403:
            errorCode = WhatsAppErrorCode.BUSINESS_NOT_VERIFIED;
            message = 'Permission denied. Your business account may not be verified.';
            break;
          case 400:
            if (errorData?.code === 131026) {
              errorCode = WhatsAppErrorCode.MESSAGE_TOO_LONG;
              message = 'Message content exceeds maximum allowed length.';
            } else if (errorData?.code === 131021) {
              errorCode = WhatsAppErrorCode.INVALID_PHONE_NUMBER;
              message = 'Invalid recipient phone number format.';
            } else if (errorData?.code === 131016) {
              errorCode = WhatsAppErrorCode.UNSUPPORTED_MESSAGE_TYPE;
              message = 'The message type is not supported for this recipient.';
            } else {
              errorCode = WhatsAppErrorCode.API_REQUEST_FAILED;
              message = errorData?.message || 'Bad request. Please check your message format.';
            }
            break;
          case 404:
            errorCode = WhatsAppErrorCode.TEMPLATE_NOT_FOUND;
            message = 'Resource not found. Template or media may not exist.';
            break;
          case 500:
          case 502:
          case 503:
            errorCode = WhatsAppErrorCode.API_REQUEST_FAILED;
            message = 'WhatsApp API is experiencing issues. Please try again later.';
            break;
          default:
            errorCode = WhatsAppErrorCode.API_REQUEST_FAILED;
            message = errorData?.message || error.message || 'An unexpected error occurred.';
        }

        throw new ApiRequestError(
          message,
          status,
          errorCode,
          context,
          error.response?.data,
          error
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

      const messageResponse: MessageResponse = {
        messageId: response.data.messages[0].id,
        success: true,
        metadata: {
          wamid: response.data.messages[0].id,
          timestamp: Date.now()
        }
      };

      if (this.storage.isEnabled() && this.storage.isFeatureEnabled('persistOutgoing')) {
        try {
          const messageWithId = { ...message, messageId: messageResponse.messageId };
          await this.storage.saveMessage(messageWithId as any);
        } catch (storageError) {
          if (process.env.DEBUG?.includes('whatsapp-sdk') || process.env.NODE_ENV !== 'production') {
            console.warn('Failed to persist outgoing message:', storageError instanceof Error ? storageError.message : String(storageError));
          }
        }
      }

      return messageResponse;
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

            messages.push(processedMessage);
          });
        }
      });
    });

    return messages;
  }

  createWebhookProcessor(handlers: WebhookHandlers): WebhookProcessor;
  createWebhookProcessor(handlersWithBuffer: WebhookHandlersWithBuffer): WebhookProcessor;
  createWebhookProcessor(handlersOrConfig: WebhookHandlers | WebhookHandlersWithBuffer): WebhookProcessor {

    const hasBufferOptions = 'enableBuffer' in handlersOrConfig ||
                             'bufferTimeMs' in handlersOrConfig ||
                             'maxBatchSize' in handlersOrConfig;

    if (hasBufferOptions) {
      const { enableBuffer, bufferTimeMs, maxBatchSize, ...handlers } = handlersOrConfig as WebhookHandlersWithBuffer;

      return new WebhookProcessor({
        verifyToken: this.config.webhookVerifyToken,
        handlers: handlers as WebhookHandlers,
        autoRespond: true,
        enableBuffer,
        bufferTimeMs,
        maxBatchSize
      }, this.storage);
    } else {
      return new WebhookProcessor({
        verifyToken: this.config.webhookVerifyToken,
        handlers: handlersOrConfig as WebhookHandlers,
        autoRespond: true
      }, this.storage);
    }
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
        status: 'read',
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
        messageId: undefined 
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
      const result = await this.sendTypingIndicator(to, messageId);
      
      if (!result.success) {
        return result;
      }


      const timeout = setTimeout(() => {

        if (process.env.DEBUG?.includes('whatsapp-sdk')) {
          console.debug(`Typing indicator for ${to} expired after ${safeDuration}ms`);
        }
      }, safeDuration);
      

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
        messageId: undefined 
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

  // ========================
  // STORAGE METHODS
  // ========================

  async initializeStorage(): Promise<void> {
    const config = this.storage.getConfig();
    if (config && config.enabled) {
      await this.storage.initialize();
    }
  }


  async disconnectStorage(): Promise<void> {
    await this.storage.disconnect();
  }


  isStorageEnabled(): boolean {
    return this.storage.isEnabled();
  }


  getStorageFeatures() {
    return this.storage.getFeatures();
  }

  async getConversation(phoneNumber: string, options?: { limit?: number; offset?: number }) {
    return await this.storage.getConversation({
      phoneNumber,
      limit: options?.limit,
      offset: options?.offset
    });
  }


  async searchMessages(query: {
    text?: string;
    phoneNumber?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  }) {
    return await this.storage.searchMessages({
      text: query.text,
      phoneNumber: query.phoneNumber,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      limit: query.limit
    });
  }

  async getMessageThread(messageId: string) {
    return await this.storage.getMessageThread(messageId);
  }


  async getConversationAnalytics(phoneNumber?: string, dateRange?: { from: Date; to: Date }) {
    return await this.storage.getAnalytics({
      phoneNumber,
      dateFrom: dateRange?.from,
      dateTo: dateRange?.to
    });
  }


  async exportConversation(phoneNumber: string, format: 'json' | 'csv' = 'json') {
    return await this.storage.exportConversation(phoneNumber, { format });
  }

  async cleanupOldMessages() {
    return await this.storage.cleanupOldMessages();
  }

  // ========================
  // BROADCAST METHODS
  // ========================


  async sendBroadcast(
    phoneNumbers: string[],
    message: OutgoingMessage,
    options?: BroadcastOptions
  ): Promise<BroadcastResult> {
    return this.broadcastManager.sendBroadcast(phoneNumbers, message, options);
  }

  async sendBroadcastText(
    phoneNumbers: string[],
    text: string,
    options?: BroadcastOptions
  ): Promise<BroadcastResult> {
    const message: OutgoingMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: WhatsAppMessageType.TEXT,
      to: '', // Will be set per recipient
      text: { body: text }
    };

    return this.broadcastManager.sendBroadcast(phoneNumbers, message, options);
  }

  async sendBulkTemplates(
    recipients: BroadcastRecipient[],
    templateName: string,
    languageCode: string,
    options?: BroadcastOptions
  ): Promise<BroadcastResult> {
    return this.broadcastManager.sendBulkTemplates(
      recipients,
      templateName,
      languageCode,
      options
    );
  }


  abortBroadcast(): void {
    this.broadcastManager.abort();
  }
  
  isBroadcastRunning(): boolean {
    return this.broadcastManager.isRunning();
  }
}