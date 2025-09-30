// Storage configuration interfaces (avoiding circular dependencies)

export interface StorageFeatures {
  persistIncoming: boolean;
  persistOutgoing: boolean;
  persistStatus: boolean;
  autoConversations: boolean;
  persistMedia: boolean;
  createThreads: boolean;
  enableSearch: boolean;
  anonymizeData?: boolean;
  retentionDays?: number;
}

export interface SupabaseOptions {
  url: string;
  apiKey: string;
  schema?: string;
  tablePrefix?: string;
  autoCreateTables?: boolean;
  enableRLS?: boolean;
}

export interface CustomAdapterOptions {
  customAdapter: any; // IStorageAdapter - will be defined later to avoid circular deps
  [key: string]: any;
}

export interface StorageConfig {
  enabled: boolean;
  provider: 'supabase' | 'custom';
  options: SupabaseOptions | CustomAdapterOptions;
  features: StorageFeatures;
  customTransformers?: any[];
}