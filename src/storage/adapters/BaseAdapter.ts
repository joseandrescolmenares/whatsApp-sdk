import {
  IStorageAdapter,
  MessageEntity,
  MessageTransformer,
  StorageFeatures,
  StorageError,
  ConversationQuery,
  ConversationResult,
  SearchQuery,
  SearchResult,
  MessageThread,
  ConversationThread,
  AnalyticsQuery,
  AnalyticsResult
} from '../interfaces/StorageTypes';
import { MessageDirection } from '../../types';
import { ProcessedIncomingMessage, MessageStatus } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { ConversationIdGenerator } from '../utils/ConversationIdGenerator';

export abstract class BaseAdapter implements IStorageAdapter {
  protected features: StorageFeatures;
  protected transformers: MessageTransformer[];
  protected connected: boolean = false;

  constructor(features: StorageFeatures, transformers: MessageTransformer[] = []) {
    this.features = features;
    this.transformers = transformers;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract initialize(): Promise<void>;

  abstract saveMessage(message: ProcessedIncomingMessage | MessageEntity): Promise<string>;
  abstract getMessage(id: string): Promise<MessageEntity | null>;
  abstract updateMessage(id: string, updates: Partial<MessageEntity>): Promise<boolean>;
  abstract deleteMessage(id: string, soft?: boolean): Promise<boolean>;
  abstract updateMessageStatus(whatsappMessageId: string, status: MessageStatus): Promise<boolean>;
  abstract getMessageStatus(whatsappMessageId: string): Promise<MessageStatus | null>;
  abstract getConversation(query: ConversationQuery): Promise<ConversationResult>;
  abstract createConversation(phoneNumber: string, businessPhoneId: string): Promise<string>;
  abstract updateConversationActivity(phoneNumber: string): Promise<void>;
  abstract searchMessages(query: SearchQuery): Promise<SearchResult>;
  abstract getMessageThread(messageId: string): Promise<MessageThread | null>;
  abstract getConversationThread(phoneNumber: string, options?: { limit?: number }): Promise<ConversationThread>;
  abstract getAnalytics(query: AnalyticsQuery): Promise<AnalyticsResult>;

  isConnected(): boolean {
    return this.connected;
  }

  protected async transformIncomingMessage(message: ProcessedIncomingMessage): Promise<MessageEntity> {
    let entity = this.createBaseMessageEntity(message);

    for (const transformer of this.transformers) {
      if (transformer.transformIncoming) {
        entity = await transformer.transformIncoming(message);
      }
    }

    return entity;
  }

  protected createBaseMessageEntity(message: ProcessedIncomingMessage): MessageEntity {
    const now = new Date();

    return {
      id: uuidv4(),
      whatsappMessageId: message.id,
      conversationId: this.generateConversationId(message.from, message.phoneNumberId),
      phoneNumberId: message.phoneNumberId,
      fromPhone: message.from,
      toPhone: message.phoneNumberId, 
      messageType: message.type,
      content: this.extractMessageContent(message),
      replyToMessageId: undefined, 
      whatsappReplyToId: message.context?.message_id,
      timestamp: new Date(parseInt(message.timestamp) * 1000),
      status: 'delivered' as any,
      direction: MessageDirection.INCOMING,
      metadata: {
        businessId: message.businessId,
        contact: message.contact,
        originalMessage: message
      },
      createdAt: now,
      updatedAt: now
    };
  }

  protected extractMessageContent(message: ProcessedIncomingMessage): any {
    const content: any = {};

    if (message.text) {
      content.text = message.text;
    }

    if (message.media) {
      content.media = {
        id: message.media.id,
        mimeType: message.media.mime_type,
        filename: message.media.filename,
        caption: message.media.caption
      };
    }

    if (message.location) {
      content.location = message.location;
    }

    if (message.interactive) {
      content.interactive = message.interactive;
    }

    if (message.reaction) {
      content.reaction = message.reaction;
    }

    return content;
  }

  protected generateConversationId(phoneNumber: string, businessPhoneId: string): string {
    return ConversationIdGenerator.generate(phoneNumber, businessPhoneId);
  }

  protected shouldPersistIncoming(): boolean {
    return this.features.persistIncoming;
  }

  protected shouldPersistOutgoing(): boolean {
    return this.features.persistOutgoing;
  }

  protected shouldCreateThreads(): boolean {
    return this.features.createThreads;
  }

  protected shouldPersistMedia(): boolean {
    return this.features.persistMedia;
  }

  protected shouldAutoCreateConversations(): boolean {
    return this.features.autoConversations;
  }

  protected normalizePhoneNumber(phone: string): string {
    if (this.features.anonymizeData) {
      return this.anonymizePhone(phone);
    }
    return phone.replace(/^\+/, '');
  }

  protected anonymizePhone(phone: string): string {
    const normalized = phone.replace(/^\+/, '');
    const visible = normalized.slice(-4);
    const hidden = '*'.repeat(Math.max(0, normalized.length - 4));
    return hidden + visible;
  }

  protected createStorageError(message: string, code: string, operation: string, details?: Record<string, any>): StorageError {
    const error = new Error(message) as StorageError;
    error.code = code;
    error.operation = operation;
    error.details = details;
    return error;
  }

  protected async safeOperation<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const storageError = this.createStorageError(
        `${operationName} failed: ${error instanceof Error ? error.message : String(error)}`,
        'STORAGE_OPERATION_FAILED',
        operationName,
        { originalError: error }
      );
      throw storageError;
    }
  }

  protected validateMessage(message: ProcessedIncomingMessage | MessageEntity): void {
    if (!message) {
      throw this.createStorageError('Message is required', 'VALIDATION_ERROR', 'validateMessage');
    }

    if ('id' in message && !message.id) {
      throw this.createStorageError('Message ID is required', 'VALIDATION_ERROR', 'validateMessage');
    }

    if ('whatsappMessageId' in message && !message.whatsappMessageId) {
      throw this.createStorageError('WhatsApp Message ID is required', 'VALIDATION_ERROR', 'validateMessage');
    }
  }

  protected validatePhoneNumber(phoneNumber: string): void {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw this.createStorageError('Valid phone number is required', 'VALIDATION_ERROR', 'validatePhoneNumber');
    }
  }

  protected isExpiredMessage(message: MessageEntity): boolean {
    if (!this.features.retentionDays) return false;

    const retentionMs = this.features.retentionDays * 24 * 60 * 60 * 1000;
    const expirationDate = new Date(Date.now() - retentionMs);
    return message.createdAt < expirationDate;
  }

  async bulkSaveMessages?(messages: (ProcessedIncomingMessage | MessageEntity)[]): Promise<string[]> {
    const ids: string[] = [];
    for (const message of messages) {
      const id = await this.saveMessage(message);
      ids.push(id);
    }
    return ids;
  }

  async bulkUpdateStatus?(updates: Array<{ whatsappMessageId: string; status: any }>): Promise<number> {
    let count = 0;
    for (const update of updates) {
      const success = await this.updateMessageStatus(update.whatsappMessageId, update.status);
      if (success) count++;
    }
    return count;
  }
}