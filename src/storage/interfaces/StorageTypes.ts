import { ProcessedIncomingMessage, MessageStatus, WhatsAppMessageType } from '../../types';

// ========================
// STORAGE CONFIGURATION (Re-export from base interfaces)
// ========================

export type {
  StorageConfig,
  StorageFeatures,
  SupabaseOptions
} from '../../interfaces/StorageConfig';

export interface CustomAdapterOptions {
  customAdapter: IStorageAdapter;
  [key: string]: any;
}

// ========================
// MESSAGE ENTITIES
// ========================

export interface MessageEntity {
  id: string;
  whatsappMessageId: string;
  conversationId: string;
  phoneNumberId: string;
  fromPhone: string;
  toPhone: string;
  messageType: WhatsAppMessageType;
  content: MessageContent;
  replyToMessageId?: string;
  whatsappReplyToId?: string;
  timestamp: Date;
  status: MessageStatus;
  direction: MessageDirection;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationEntity {
  id: string;
  phoneNumber: string;
  businessPhoneId: string;
  lastMessageAt: Date;
  messageCount: number;
  unreadCount?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageContent {
  text?: string;
  media?: MediaContent;
  location?: LocationContent;
  interactive?: InteractiveContent;
  contacts?: ContactContent[];
  reaction?: ReactionContent;
  [key: string]: any;
}

export interface MediaContent {
  id: string;
  mimeType: string;
  filename?: string;
  caption?: string;
  url?: string;
  localPath?: string;
}

export interface LocationContent {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface InteractiveContent {
  type: string;
  buttonId?: string;
  listId?: string;
  flowResponse?: any;
}

export interface ContactContent {
  name: string;
  phone?: string;
  email?: string;
  [key: string]: any;
}

export interface ReactionContent {
  messageId: string;
  emoji: string;
}

// MessageDirection is imported from main types to avoid duplication
import type { MessageDirection } from '../../types';
export type { MessageDirection } from '../../types';

// ========================
// SEARCH AND QUERY TYPES
// ========================

export interface SearchQuery {
  text?: string;
  phoneNumber?: string;
  messageType?: WhatsAppMessageType;
  direction?: MessageDirection;
  dateFrom?: Date;
  dateTo?: Date;
  hasMedia?: boolean;
  conversationId?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
}

export interface SearchResult {
  messages: MessageEntity[];
  total: number;
  hasMore: boolean;
}

export interface ConversationQuery {
  phoneNumber: string;
  limit?: number;
  offset?: number;
  includeReplies?: boolean;
  beforeMessageId?: string;
  afterMessageId?: string;
}

export interface ConversationResult {
  conversation: ConversationEntity;
  messages: MessageEntity[];
  total: number;
  hasMore: boolean;
}

// ========================
// THREAD AND REPLY TYPES
// ========================

export interface MessageThread {
  originalMessage: MessageEntity;
  replies: MessageEntity[];
  depth: number;
}

export interface ConversationThread {
  messages: MessageWithReplies[];
  totalMessages: number;
}

export interface MessageWithReplies extends MessageEntity {
  replies?: MessageWithReplies[];
  replyToMessage?: MessageEntity;
}

// ========================
// ANALYTICS TYPES
// ========================

export interface AnalyticsQuery {
  phoneNumber?: string;
  dateFrom?: Date;
  dateTo?: Date;
  groupBy?: 'day' | 'week' | 'month';
  messageTypes?: WhatsAppMessageType[];
}

export interface AnalyticsResult {
  totalMessages: number;
  incomingMessages: number;
  outgoingMessages: number;
  messagesByType: Record<WhatsAppMessageType, number>;
  messagesByDay?: Array<{ date: string; count: number }>;
  topContacts?: Array<{ phoneNumber: string; count: number }>;
  averageResponseTime?: number;
}

// ========================
// TRANSFORMER TYPES
// ========================

export interface MessageTransformer {
  name: string;
  transformIncoming?: (message: ProcessedIncomingMessage) => MessageEntity | Promise<MessageEntity>;
  transformOutgoing?: (message: any) => MessageEntity | Promise<MessageEntity>;
  transformForStorage?: (entity: MessageEntity) => Record<string, any> | Promise<Record<string, any>>;
  transformFromStorage?: (data: Record<string, any>) => MessageEntity | Promise<MessageEntity>;
}

// ========================
// ERROR TYPES
// ========================

export interface StorageError extends Error {
  code: string;
  operation: string;
  details?: Record<string, any>;
}

export interface StorageOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: StorageError;
}

// ========================
// EXPORT TYPES
// ========================

export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  includeMedia?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  phoneNumbers?: string[];
}

export interface ExportResult {
  filename: string;
  url?: string;
  buffer?: Buffer;
  mimeType: string;
}

// ========================
// MAIN INTERFACE
// ========================

export interface IStorageAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  initialize(): Promise<void>;

  saveMessage(message: ProcessedIncomingMessage | MessageEntity): Promise<string>;
  getMessage(id: string): Promise<MessageEntity | null>;
  updateMessage(id: string, updates: Partial<MessageEntity>): Promise<boolean>;
  deleteMessage(id: string, soft?: boolean): Promise<boolean>;

  updateMessageStatus(whatsappMessageId: string, status: MessageStatus): Promise<boolean>;
  getMessageStatus(whatsappMessageId: string): Promise<MessageStatus | null>;

  getConversation(query: ConversationQuery): Promise<ConversationResult>;
  createConversation(phoneNumber: string, businessPhoneId: string): Promise<string>;
  updateConversationActivity(phoneNumber: string): Promise<void>;

  searchMessages(query: SearchQuery): Promise<SearchResult>;
  getMessageThread(messageId: string): Promise<MessageThread | null>;
  getConversationThread(phoneNumber: string, options?: { limit?: number }): Promise<ConversationThread>;

  getAnalytics(query: AnalyticsQuery): Promise<AnalyticsResult>;

  saveMediaFile?(mediaId: string, buffer: Buffer, mimeType: string): Promise<string>;
  getMediaFile?(mediaId: string): Promise<Buffer | null>;

  bulkSaveMessages?(messages: (ProcessedIncomingMessage | MessageEntity)[]): Promise<string[]>;
  bulkUpdateStatus?(updates: Array<{ whatsappMessageId: string; status: MessageStatus }>): Promise<number>;

  exportConversation?(phoneNumber: string, options?: ExportOptions): Promise<ExportResult>;
  importMessages?(data: any[]): Promise<number>;

  cleanupOldMessages?(retentionDays: number): Promise<number>;
}