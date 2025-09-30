import { BaseAdapter } from './BaseAdapter';
import {
  SupabaseOptions,
  StorageFeatures,
  MessageTransformer,
  MessageEntity,
  ConversationEntity,
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

type SupabaseClient = any;

export class SupabaseAdapter extends BaseAdapter {
  private supabase: SupabaseClient | null = null;
  private options: SupabaseOptions;

  constructor(
    options: SupabaseOptions,
    features: StorageFeatures,
    transformers: MessageTransformer[] = []
  ) {
    super(features, transformers);
    this.options = {
      schema: 'public',
      tablePrefix: 'whatsapp_',
      autoCreateTables: true,
      enableRLS: false,
      ...options
    };
  }

  async connect(): Promise<void> {
    try {
      const { createClient } = await import('@supabase/supabase-js');

      this.supabase = createClient(this.options.url, this.options.apiKey, {
        db: { schema: this.options.schema }
      });

      const { error } = await this.supabase.from(`${this.options.tablePrefix}messages`).select('id').limit(1);

      if (error && error.code === 'PGRST116') {
        if (this.options.autoCreateTables) {
          await this.createTables();
        } else {
          throw this.createStorageError(
            'Tables do not exist and auto-create is disabled',
            'TABLES_NOT_FOUND',
            'connect'
          );
        }
      } else if (error) {
        throw error;
      }

      this.connected = true;
    } catch (error) {
      throw this.createStorageError(
        `Failed to connect to Supabase: ${error instanceof Error ? error.message : String(error)}`,
        'CONNECTION_FAILED',
        'connect',
        { error }
      );
    }
  }

  async disconnect(): Promise<void> {
    this.supabase = null;
    this.connected = false;
  }

  async initialize(): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }

    if (this.options.autoCreateTables) {
      await this.createTables();
    }
  }

  private async createTables(): Promise<void> {
    if (!this.supabase) throw new Error('Not connected');

    const messagesTable = `${this.options.tablePrefix}messages`;
    const conversationsTable = `${this.options.tablePrefix}conversations`;

    await this.supabase.rpc('create_whatsapp_tables', {
      messages_table: messagesTable,
      conversations_table: conversationsTable,
      enable_rls: this.options.enableRLS
    }).then(({ error }: any) => {
      if (error && !error.message.includes('already exists')) {
        throw error;
      }
    });
  }

  async saveMessage(message: ProcessedIncomingMessage | MessageEntity): Promise<string> {
    if (!this.supabase) throw new Error('Not connected');

    this.validateMessage(message);

    let entity: MessageEntity;

    if ('whatsappMessageId' in message) {
      entity = message as MessageEntity;
    } else {
      entity = await this.transformIncomingMessage(message as ProcessedIncomingMessage);
    }

    if (entity.whatsappReplyToId && this.shouldCreateThreads()) {
      const { data: parentMessage } = await this.supabase
        .from(`${this.options.tablePrefix}messages`)
        .select('id')
        .eq('whatsapp_message_id', entity.whatsappReplyToId)
        .single();

      if (parentMessage) {
        entity.replyToMessageId = parentMessage.id;
      }
    }

    if (this.shouldAutoCreateConversations()) {
      await this.ensureConversationExists(entity.fromPhone, entity.phoneNumberId);
    }

    const { data, error } = await this.supabase
      .from(`${this.options.tablePrefix}messages`)
      .insert(this.entityToRow(entity))
      .select('id')
      .single();

    if (error) {
      throw this.createStorageError(
        `Failed to save message: ${error.message}`,
        'SAVE_FAILED',
        'saveMessage',
        { error, message: entity }
      );
    }

    if (this.shouldAutoCreateConversations()) {
      await this.updateConversationActivity(entity.fromPhone);
    }

    return data.id;
  }

  async getMessage(id: string): Promise<MessageEntity | null> {
    if (!this.supabase) throw new Error('Not connected');

    const { data, error } = await this.supabase
      .from(`${this.options.tablePrefix}messages`)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; 
      throw this.createStorageError(
        `Failed to get message: ${error.message}`,
        'GET_FAILED',
        'getMessage',
        { error, id }
      );
    }

    return this.rowToEntity(data);
  }

  async updateMessage(id: string, updates: Partial<MessageEntity>): Promise<boolean> {
    if (!this.supabase) throw new Error('Not connected');

    const { error } = await this.supabase
      .from(`${this.options.tablePrefix}messages`)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw this.createStorageError(
        `Failed to update message: ${error.message}`,
        'UPDATE_FAILED',
        'updateMessage',
        { error, id, updates }
      );
    }

    return true;
  }

  async deleteMessage(id: string, soft: boolean = true): Promise<boolean> {
    if (!this.supabase) throw new Error('Not connected');

    if (soft) {
      return await this.updateMessage(id, {
        metadata: { ...{}, deleted: true, deletedAt: new Date().toISOString() }
      });
    } else {
      const { error } = await this.supabase
        .from(`${this.options.tablePrefix}messages`)
        .delete()
        .eq('id', id);

      if (error) {
        throw this.createStorageError(
          `Failed to delete message: ${error.message}`,
          'DELETE_FAILED',
          'deleteMessage',
          { error, id }
        );
      }
    }

    return true;
  }

  async updateMessageStatus(whatsappMessageId: string, status: MessageStatus): Promise<boolean> {
    if (!this.supabase) throw new Error('Not connected');

    const { error } = await this.supabase
      .from(`${this.options.tablePrefix}messages`)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('whatsapp_message_id', whatsappMessageId);

    if (error) {
      throw this.createStorageError(
        `Failed to update message status: ${error.message}`,
        'STATUS_UPDATE_FAILED',
        'updateMessageStatus',
        { error, whatsappMessageId, status }
      );
    }

    return true;
  }

  async getMessageStatus(whatsappMessageId: string): Promise<MessageStatus | null> {
    if (!this.supabase) throw new Error('Not connected');

    const { data, error } = await this.supabase
      .from(`${this.options.tablePrefix}messages`)
      .select('status')
      .eq('whatsapp_message_id', whatsappMessageId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw this.createStorageError(
        `Failed to get message status: ${error.message}`,
        'GET_STATUS_FAILED',
        'getMessageStatus',
        { error, whatsappMessageId }
      );
    }

    return data.status;
  }

  async getConversation(query: ConversationQuery): Promise<ConversationResult> {
    if (!this.supabase) throw new Error('Not connected');

    this.validatePhoneNumber(query.phoneNumber);

    let messagesQuery = this.supabase
      .from(`${this.options.tablePrefix}messages`)
      .select('*')
      .or(`from_phone.eq.${query.phoneNumber},to_phone.eq.${query.phoneNumber}`)
      .order('timestamp', { ascending: false });

    if (query.limit) {
      messagesQuery = messagesQuery.limit(query.limit);
    }

    if (query.offset) {
      messagesQuery = messagesQuery.range(query.offset, query.offset + (query.limit || 50) - 1);
    }

    if (query.beforeMessageId) {
      const { data: beforeMsg } = await this.supabase
        .from(`${this.options.tablePrefix}messages`)
        .select('timestamp')
        .eq('id', query.beforeMessageId)
        .single();

      if (beforeMsg) {
        messagesQuery = messagesQuery.lt('timestamp', beforeMsg.timestamp);
      }
    }

    if (query.afterMessageId) {
      const { data: afterMsg } = await this.supabase
        .from(`${this.options.tablePrefix}messages`)
        .select('timestamp')
        .eq('id', query.afterMessageId)
        .single();

      if (afterMsg) {
        messagesQuery = messagesQuery.gt('timestamp', afterMsg.timestamp);
      }
    }

    const { data: messages, error: messagesError } = await messagesQuery;

    if (messagesError) {
      throw this.createStorageError(
        `Failed to get conversation messages: ${messagesError.message}`,
        'CONVERSATION_FAILED',
        'getConversation',
        { error: messagesError, query }
      );
    }

    const { data: conversation } = await this.supabase
      .from(`${this.options.tablePrefix}conversations`)
      .select('*')
      .eq('phone_number', query.phoneNumber)
      .single();

    const { count } = await this.supabase
      .from(`${this.options.tablePrefix}messages`)
      .select('*', { count: 'exact', head: true })
      .or(`from_phone.eq.${query.phoneNumber},to_phone.eq.${query.phoneNumber}`);

    const entities = messages.map((row: any) => this.rowToEntity(row));

    return {
      conversation: conversation ? this.rowToConversationEntity(conversation) : await this.getDefaultConversation(query.phoneNumber),
      messages: entities,
      total: count || 0,
      hasMore: (count || 0) > (query.offset || 0) + entities.length
    };
  }

  async createConversation(phoneNumber: string, businessPhoneId: string): Promise<string> {
    if (!this.supabase) throw new Error('Not connected');

    const { data, error } = await this.supabase
      .from(`${this.options.tablePrefix}conversations`)
      .insert({
        phone_number: phoneNumber,
        business_phone_id: businessPhoneId,
        last_message_at: new Date().toISOString(),
        message_count: 0,
        unread_count: 0
      })
      .select('id')
      .single();

    if (error) {
      throw this.createStorageError(
        `Failed to create conversation: ${error.message}`,
        'CREATE_CONVERSATION_FAILED',
        'createConversation',
        { error, phoneNumber, businessPhoneId }
      );
    }

    return data.id;
  }

  async updateConversationActivity(phoneNumber: string): Promise<void> {
    if (!this.supabase) throw new Error('Not connected');

    await this.supabase
      .from(`${this.options.tablePrefix}conversations`)
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('phone_number', phoneNumber);
  }

  async searchMessages(query: SearchQuery): Promise<SearchResult> {
    if (!this.supabase) throw new Error('Not connected');

    let searchQuery = this.supabase
      .from(`${this.options.tablePrefix}messages`)
      .select('*', { count: 'exact' });

    if (query.text) {
      searchQuery = searchQuery.textSearch('content', query.text);
    }

    if (query.phoneNumber) {
      searchQuery = searchQuery.or(`from_phone.eq.${query.phoneNumber},to_phone.eq.${query.phoneNumber}`);
    }

    if (query.messageType) {
      searchQuery = searchQuery.eq('message_type', query.messageType);
    }

    if (query.direction) {
      searchQuery = searchQuery.eq('direction', query.direction);
    }

    if (query.dateFrom) {
      searchQuery = searchQuery.gte('timestamp', query.dateFrom.toISOString());
    }

    if (query.dateTo) {
      searchQuery = searchQuery.lte('timestamp', query.dateTo.toISOString());
    }

    if (query.conversationId) {
      searchQuery = searchQuery.eq('conversation_id', query.conversationId);
    }

    if (query.hasMedia) {
      searchQuery = searchQuery.not('content->media', 'is', null);
    }

    const orderBy = query.orderBy || 'timestamp';
    const orderDirection = query.orderDirection || 'desc';
    searchQuery = searchQuery.order(orderBy, { ascending: orderDirection === 'asc' });

    if (query.limit) {
      searchQuery = searchQuery.limit(query.limit);
    }

    if (query.offset) {
      searchQuery = searchQuery.range(query.offset, query.offset + (query.limit || 50) - 1);
    }

    const { data, error, count } = await searchQuery;

    if (error) {
      throw this.createStorageError(
        `Failed to search messages: ${error.message}`,
        'SEARCH_FAILED',
        'searchMessages',
        { error, query }
      );
    }

    const messages = (data || []).map((row: any) => this.rowToEntity(row));

    return {
      messages,
      total: count || 0,
      hasMore: (count || 0) > (query.offset || 0) + messages.length
    };
  }

  async getMessageThread(messageId: string): Promise<MessageThread | null> {
    if (!this.supabase) throw new Error('Not connected');

    const message = await this.getMessage(messageId);
    if (!message) return null;

    const { data: replies, error } = await this.supabase
      .from(`${this.options.tablePrefix}messages`)
      .select('*')
      .eq('reply_to_message_id', messageId)
      .order('timestamp', { ascending: true });

    if (error) {
      throw this.createStorageError(
        `Failed to get message thread: ${error.message}`,
        'THREAD_FAILED',
        'getMessageThread',
        { error, messageId }
      );
    }

    return {
      originalMessage: message,
      replies: (replies || []).map((row: any) => this.rowToEntity(row)),
      depth: replies ? replies.length : 0
    };
  }

  async getConversationThread(phoneNumber: string, options: { limit?: number } = {}): Promise<ConversationThread> {
    if (!this.supabase) throw new Error('Not connected');

    const conversation = await this.getConversation({
      phoneNumber,
      limit: options.limit,
      includeReplies: true
    });

    const messageMap = new Map<string, any>();
    const rootMessages: any[] = [];

    conversation.messages.forEach(msg => {
      messageMap.set(msg.id, { ...msg, replies: [] });
    });

    conversation.messages.forEach(msg => {
      const messageWithReplies = messageMap.get(msg.id)!;

      if (msg.replyToMessageId && messageMap.has(msg.replyToMessageId)) {
        const parent = messageMap.get(msg.replyToMessageId)!;
        parent.replies = parent.replies || [];
        parent.replies.push(messageWithReplies);
      } else {
        rootMessages.push(messageWithReplies);
      }
    });

    return {
      messages: rootMessages,
      totalMessages: conversation.total
    };
  }

  async getAnalytics(query: AnalyticsQuery): Promise<AnalyticsResult> {
    if (!this.supabase) throw new Error('Not connected');

    let analyticsQuery = this.supabase
      .from(`${this.options.tablePrefix}messages`)
      .select('*');

    if (query.phoneNumber) {
      analyticsQuery = analyticsQuery.or(`from_phone.eq.${query.phoneNumber},to_phone.eq.${query.phoneNumber}`);
    }

    if (query.dateFrom) {
      analyticsQuery = analyticsQuery.gte('timestamp', query.dateFrom.toISOString());
    }

    if (query.dateTo) {
      analyticsQuery = analyticsQuery.lte('timestamp', query.dateTo.toISOString());
    }

    const { data, error } = await analyticsQuery;

    if (error) {
      throw this.createStorageError(
        `Failed to get analytics: ${error.message}`,
        'ANALYTICS_FAILED',
        'getAnalytics',
        { error, query }
      );
    }

    const messages = data || [];
    const totalMessages = messages.length;
    const incomingMessages = messages.filter((m: any) => m.direction === MessageDirection.INCOMING).length;
    const outgoingMessages = totalMessages - incomingMessages;

    const messagesByType: Record<string, number> = {};
    messages.forEach((msg: any) => {
      messagesByType[msg.message_type] = (messagesByType[msg.message_type] || 0) + 1;
    });

    return {
      totalMessages,
      incomingMessages,
      outgoingMessages,
      messagesByType,
      averageResponseTime: 0 
    };
  }

  private async ensureConversationExists(phoneNumber: string, businessPhoneId: string): Promise<string> {
    const { data: existing } = await this.supabase!
      .from(`${this.options.tablePrefix}conversations`)
      .select('id')
      .eq('phone_number', phoneNumber)
      .single();

    if (existing) {
      return existing.id;
    }

    return await this.createConversation(phoneNumber, businessPhoneId);
  }

  private entityToRow(entity: MessageEntity): Record<string, any> {
    return {
      id: entity.id,
      whatsapp_message_id: entity.whatsappMessageId,
      conversation_id: entity.conversationId,
      phone_number_id: entity.phoneNumberId,
      from_phone: this.normalizePhoneNumber(entity.fromPhone),
      to_phone: this.normalizePhoneNumber(entity.toPhone),
      message_type: entity.messageType,
      content: entity.content,
      reply_to_message_id: entity.replyToMessageId,
      whatsapp_reply_to_id: entity.whatsappReplyToId,
      timestamp: entity.timestamp.toISOString(),
      status: entity.status,
      direction: entity.direction,
      metadata: entity.metadata,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString()
    };
  }

  private rowToEntity(row: Record<string, any>): MessageEntity {
    return {
      id: row.id,
      whatsappMessageId: row.whatsapp_message_id,
      conversationId: row.conversation_id,
      phoneNumberId: row.phone_number_id,
      fromPhone: row.from_phone,
      toPhone: row.to_phone,
      messageType: row.message_type,
      content: row.content,
      replyToMessageId: row.reply_to_message_id,
      whatsappReplyToId: row.whatsapp_reply_to_id,
      timestamp: new Date(row.timestamp),
      status: row.status,
      direction: row.direction,
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private rowToConversationEntity(row: Record<string, any>): ConversationEntity {
    return {
      id: row.id,
      phoneNumber: row.phone_number,
      businessPhoneId: row.business_phone_id,
      lastMessageAt: new Date(row.last_message_at),
      messageCount: row.message_count || 0,
      unreadCount: row.unread_count || 0,
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private async getDefaultConversation(phoneNumber: string): Promise<ConversationEntity> {
    return {
      id: '',
      phoneNumber,
      businessPhoneId: '',
      lastMessageAt: new Date(),
      messageCount: 0,
      unreadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}