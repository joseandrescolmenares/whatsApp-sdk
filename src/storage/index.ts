// Main exports
export { StorageManager } from './managers/StorageManager';

// Interfaces and types (specific exports to avoid conflicts)
export { IStorageAdapter } from './interfaces/IStorageAdapter';

// Adapters
export { BaseAdapter } from './adapters/BaseAdapter';
export { SupabaseAdapter } from './adapters/SupabaseAdapter';

// Utilities
export {
  DefaultIncomingTransformer,
  DefaultOutgoingTransformer,
  MetadataEnricherTransformer,
  AnonymizingTransformer,
  ContentFilterTransformer,
  LocationContextTransformer,
  CompositeTransformer,
  TransformerFactory
} from './utils/MessageTransformer';

export { SchemaBuilder } from './utils/SchemaBuilder';
export { ConversationIdGenerator } from './utils/ConversationIdGenerator';

// Re-export storage-specific types (avoiding conflicts with main types)
export type {
  StorageConfig,
  StorageFeatures,
  SupabaseOptions,
  CustomAdapterOptions,
  MessageEntity,
  ConversationEntity,
  SearchQuery,
  SearchResult,
  ConversationQuery,
  ConversationResult,
  MessageThread,
  ConversationThread,
  AnalyticsQuery,
  AnalyticsResult,
  MessageTransformer,
  StorageOperationResult,
  StorageError,
  ExportOptions,
  ExportResult,
  MediaContent,
  LocationContent,
  InteractiveContent,
  ContactContent,
  ReactionContent
} from './interfaces/StorageTypes';

// Note: MessageDirection is exported from main types to avoid conflicts