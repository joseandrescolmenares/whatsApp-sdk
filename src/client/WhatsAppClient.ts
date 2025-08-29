
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
  ProcessedIncomingMessage,
  IncomingMessage,
  WhatsAppMessageType
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
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
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