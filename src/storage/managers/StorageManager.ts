import {
  IStorageAdapter,
  StorageConfig,
  StorageFeatures,
  MessageEntity,
  ConversationQuery,
  ConversationResult,
  SearchQuery,
  SearchResult,
  MessageThread,
  ConversationThread,
  AnalyticsQuery,
  AnalyticsResult,
  ExportOptions,
  ExportResult,
  SupabaseOptions,
  CustomAdapterOptions,
  StorageOperationResult,
  StorageError
} from '../interfaces/StorageTypes';
import { ProcessedIncomingMessage, MessageStatus } from '../../types';
import { SupabaseAdapter } from '../adapters/SupabaseAdapter';
import { TransformerFactory } from '../utils/MessageTransformer';


export class StorageManager {
  private adapter: IStorageAdapter | null = null;
  private config: StorageConfig | null = null;
  private isInitialized: boolean = false;

  constructor(config?: StorageConfig) {
    if (config) {
      this.configure(config);
    }
  }

  configure(config: StorageConfig): void {
    this.config = config;
    this.adapter = null;
    this.isInitialized = false;
  }

  async initialize(): Promise<void> {
    if (!this.config) {
      throw new Error('Storage not configured');
    }

    if (!this.config.enabled) {
      return;
    }

    try {
      this.adapter = await this.createAdapter();
      await this.adapter.connect();
      await this.adapter.initialize();
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize storage: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  isEnabled(): boolean {
    return this.config?.enabled === true && this.isInitialized && this.adapter !== null;
  }

  async disconnect(): Promise<void> {
    if (this.adapter) {
      await this.adapter.disconnect();
      this.adapter = null;
      this.isInitialized = false;
    }
  }

  // ========================
  // MESSAGE OPERATIONS
  // ========================


  async saveMessage(message: ProcessedIncomingMessage | MessageEntity): Promise<StorageOperationResult<string>> {
    if (!this.isEnabled()) {
      return { success: false, error: this.createNotEnabledError('saveMessage') };
    }

    try {
      const messageId = await this.adapter!.saveMessage(message);
      return { success: true, data: messageId };
    } catch (error) {
      return { success: false, error: this.wrapError(error, 'saveMessage') };
    }
  }

  async getMessage(id: string): Promise<StorageOperationResult<MessageEntity | null>> {
    if (!this.isEnabled()) {
      return { success: false, error: this.createNotEnabledError('getMessage') };
    }

    try {
      const message = await this.adapter!.getMessage(id);
      return { success: true, data: message };
    } catch (error) {
      return { success: false, error: this.wrapError(error, 'getMessage') };
    }
  }

  async updateMessage(id: string, updates: Partial<MessageEntity>): Promise<StorageOperationResult<boolean>> {
    if (!this.isEnabled()) {
      return { success: false, error: this.createNotEnabledError('updateMessage') };
    }

    try {
      const result = await this.adapter!.updateMessage(id, updates);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: this.wrapError(error, 'updateMessage') };
    }
  }

  async deleteMessage(id: string, soft: boolean = true): Promise<StorageOperationResult<boolean>> {
    if (!this.isEnabled()) {
      return { success: false, error: this.createNotEnabledError('deleteMessage') };
    }

    try {
      const result = await this.adapter!.deleteMessage(id, soft);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: this.wrapError(error, 'deleteMessage') };
    }
  }

  async updateMessageStatus(whatsappMessageId: string, status: MessageStatus): Promise<StorageOperationResult<boolean>> {
    if (!this.isEnabled()) {
      return { success: false, error: this.createNotEnabledError('updateMessageStatus') };
    }

    if (!this.config!.features.persistStatus) {
      return { success: false, error: this.createFeatureDisabledError('persistStatus') };
    }

    try {
      const result = await this.adapter!.updateMessageStatus(whatsappMessageId, status);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: this.wrapError(error, 'updateMessageStatus') };
    }
  }

  // ========================
  // CONVERSATION OPERATIONS
  // ========================

  async getConversation(query: ConversationQuery): Promise<StorageOperationResult<ConversationResult>> {
    if (!this.isEnabled()) {
      return { success: false, error: this.createNotEnabledError('getConversation') };
    }

    try {
      const conversation = await this.adapter!.getConversation(query);
      return { success: true, data: conversation };
    } catch (error) {
      return { success: false, error: this.wrapError(error, 'getConversation') };
    }
  }


  async getConversationThread(phoneNumber: string, options?: { limit?: number }): Promise<StorageOperationResult<ConversationThread>> {
    if (!this.isEnabled()) {
      return { success: false, error: this.createNotEnabledError('getConversationThread') };
    }

    if (!this.config!.features.createThreads) {
      return { success: false, error: this.createFeatureDisabledError('createThreads') };
    }

    try {
      const thread = await this.adapter!.getConversationThread(phoneNumber, options);
      return { success: true, data: thread };
    } catch (error) {
      return { success: false, error: this.wrapError(error, 'getConversationThread') };
    }
  }

  // ========================
  // SEARCH OPERATIONS
  // ========================

  async searchMessages(query: SearchQuery): Promise<StorageOperationResult<SearchResult>> {
    if (!this.isEnabled()) {
      return { success: false, error: this.createNotEnabledError('searchMessages') };
    }

    if (!this.config!.features.enableSearch) {
      return { success: false, error: this.createFeatureDisabledError('enableSearch') };
    }

    try {
      const result = await this.adapter!.searchMessages(query);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: this.wrapError(error, 'searchMessages') };
    }
  }

  async getMessageThread(messageId: string): Promise<StorageOperationResult<MessageThread | null>> {
    if (!this.isEnabled()) {
      return { success: false, error: this.createNotEnabledError('getMessageThread') };
    }

    if (!this.config!.features.createThreads) {
      return { success: false, error: this.createFeatureDisabledError('createThreads') };
    }

    try {
      const thread = await this.adapter!.getMessageThread(messageId);
      return { success: true, data: thread };
    } catch (error) {
      return { success: false, error: this.wrapError(error, 'getMessageThread') };
    }
  }

  // ========================
  // ANALYTICS OPERATIONS
  // ========================


  async getAnalytics(query: AnalyticsQuery): Promise<StorageOperationResult<AnalyticsResult>> {
    if (!this.isEnabled()) {
      return { success: false, error: this.createNotEnabledError('getAnalytics') };
    }

    try {
      const analytics = await this.adapter!.getAnalytics(query);
      return { success: true, data: analytics };
    } catch (error) {
      return { success: false, error: this.wrapError(error, 'getAnalytics') };
    }
  }

  // ========================
  // BULK OPERATIONS
  // ========================


  async bulkSaveMessages(messages: (ProcessedIncomingMessage | MessageEntity)[]): Promise<StorageOperationResult<string[]>> {
    if (!this.isEnabled()) {
      return { success: false, error: this.createNotEnabledError('bulkSaveMessages') };
    }

    try {
      let result: string[];

      if (this.adapter!.bulkSaveMessages) {
        result = await this.adapter!.bulkSaveMessages(messages);
      } else {
        result = [];
        for (const message of messages) {
          const id = await this.adapter!.saveMessage(message);
          result.push(id);
        }
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: this.wrapError(error, 'bulkSaveMessages') };
    }
  }


  async bulkUpdateStatus(updates: Array<{ whatsappMessageId: string; status: MessageStatus }>): Promise<StorageOperationResult<number>> {
    if (!this.isEnabled()) {
      return { success: false, error: this.createNotEnabledError('bulkUpdateStatus') };
    }

    if (!this.config!.features.persistStatus) {
      return { success: false, error: this.createFeatureDisabledError('persistStatus') };
    }

    try {
      let result: number;

      if (this.adapter!.bulkUpdateStatus) {
        result = await this.adapter!.bulkUpdateStatus(updates);
      } else {
        result = 0;
        for (const update of updates) {
          const success = await this.adapter!.updateMessageStatus(update.whatsappMessageId, update.status);
          if (success) result++;
        }
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: this.wrapError(error, 'bulkUpdateStatus') };
    }
  }

  // ========================
  // EXPORT/IMPORT OPERATIONS
  // ========================

  async exportConversation(phoneNumber: string, options?: ExportOptions): Promise<StorageOperationResult<ExportResult>> {
    if (!this.isEnabled()) {
      return { success: false, error: this.createNotEnabledError('exportConversation') };
    }

    try {
      if (!this.adapter!.exportConversation) {
        throw new Error('Export functionality not supported by current adapter');
      }

      const result = await this.adapter!.exportConversation(phoneNumber, options);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: this.wrapError(error, 'exportConversation') };
    }
  }

  // ========================
  // MAINTENANCE OPERATIONS
  // ========================

  async cleanupOldMessages(): Promise<StorageOperationResult<number>> {
    if (!this.isEnabled()) {
      return { success: false, error: this.createNotEnabledError('cleanupOldMessages') };
    }

    if (!this.config!.features.retentionDays) {
      return { success: true, data: 0 }; // No cleanup needed
    }

    try {
      if (!this.adapter!.cleanupOldMessages) {
        return { success: true, data: 0 }; // Adapter doesn't support cleanup
      }

      const deletedCount = await this.adapter!.cleanupOldMessages(this.config!.features.retentionDays);
      return { success: true, data: deletedCount };
    } catch (error) {
      return { success: false, error: this.wrapError(error, 'cleanupOldMessages') };
    }
  }

  // ========================
  // FEATURE CHECKS
  // ========================

  isFeatureEnabled(feature: keyof StorageFeatures): boolean {
    return this.config?.features[feature] === true;
  }


  getConfig(): StorageConfig | null {
    return this.config;
  }


  getFeatures(): StorageFeatures | null {
    return this.config?.features || null;
  }

  // ========================
  // PRIVATE METHODS
  // ========================

  private async createAdapter(): Promise<IStorageAdapter> {
    if (!this.config) {
      throw new Error('Storage not configured');
    }

    const features = this.config.features;
    const transformers = this.config.customTransformers || TransformerFactory.createDefault();

    switch (this.config.provider) {
      case 'supabase': {
        const supabaseOptions = this.config.options as SupabaseOptions;
        return new SupabaseAdapter(supabaseOptions, features, transformers);
      }

      case 'custom': {
        const customOptions = this.config.options as CustomAdapterOptions;
        return customOptions.customAdapter;
      }

      default:
        throw new Error(`Unsupported storage provider: ${this.config.provider}`);
    }
  }

  private createNotEnabledError(operation: string): StorageError {
    const error = new Error('Storage is not enabled or not initialized') as StorageError;
    error.code = 'STORAGE_NOT_ENABLED';
    error.operation = operation;
    return error;
  }

  private createFeatureDisabledError(feature: string): StorageError {
    const error = new Error(`Feature '${feature}' is not enabled`) as StorageError;
    error.code = 'FEATURE_DISABLED';
    error.operation = feature;
    return error;
  }

  private wrapError(error: unknown, operation: string): StorageError {
    if (error instanceof Error && 'code' in error) {
      return error as StorageError;
    }

    const wrappedError = new Error(error instanceof Error ? error.message : String(error)) as StorageError;
    wrappedError.code = 'STORAGE_ERROR';
    wrappedError.operation = operation;
    wrappedError.details = { originalError: error };
    return wrappedError;
  }

  // ========================
  // STATIC FACTORY METHODS
  // ========================

  static createSupabase(options: SupabaseOptions, features: Partial<StorageFeatures> = {}): StorageManager {
    const defaultFeatures: StorageFeatures = {
      persistIncoming: true,
      persistOutgoing: true,
      persistStatus: true,
      autoConversations: true,
      persistMedia: false,
      createThreads: true,
      enableSearch: true,
      anonymizeData: false,
      retentionDays: undefined
    };

    const config: StorageConfig = {
      enabled: true,
      provider: 'supabase',
      options,
      features: { ...defaultFeatures, ...features }
    };

    return new StorageManager(config);
  }


  static createCustom(adapter: IStorageAdapter, features: Partial<StorageFeatures> = {}): StorageManager {
    const defaultFeatures: StorageFeatures = {
      persistIncoming: true,
      persistOutgoing: true,
      persistStatus: true,
      autoConversations: true,
      persistMedia: false,
      createThreads: true,
      enableSearch: true,
      anonymizeData: false,
      retentionDays: undefined
    };

    const config: StorageConfig = {
      enabled: true,
      provider: 'custom',
      options: { customAdapter: adapter },
      features: { ...defaultFeatures, ...features }
    };

    return new StorageManager(config);
  }


  static createDisabled(): StorageManager {
    const config: StorageConfig = {
      enabled: false,
      provider: 'custom',
      options: { customAdapter: {} as IStorageAdapter },
      features: {
        persistIncoming: false,
        persistOutgoing: false,
        persistStatus: false,
        autoConversations: false,
        persistMedia: false,
        createThreads: false,
        enableSearch: false
      }
    };

    return new StorageManager(config);
  }
}