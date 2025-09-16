
// ========================
// ENUMS
// ========================

export enum WhatsAppMessageType {
  AUDIO = 'audio',
  TEXT = 'text',
  INTERACTIVE = 'interactive',
  TEMPLATE = 'template',
  BUTTON = 'button',
  FLOW = 'nfm_reply',
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACTS = 'contacts',
  STICKER = 'sticker',
  REACTION = 'reaction',
  TYPING_INDICATOR = 'typing_indicator',
  READ_RECEIPT = 'read_receipt',
}

export enum MessageDirection {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing'
}

export enum MessageSender {
  USER = 'user',
  ASSISTANT = 'assistant',
  HUMAN = 'human'
}

// ========================
// CLIENT CONFIGURATION
// ========================

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  baseUrl?: string;
  apiVersion?: string;
  webhookVerifyToken?: string;
  businessId?: string;
  timeout?: number;
}

// ========================
// MESSAGE TYPES
// ========================

export interface MessageResponse {
  messageId: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface MediaResponse {
  id: string;
  success: boolean;
  error?: string;
}

export interface MediaInfo {
  url: string;
  file_size: number;
  id: string;
  mime_type?: string;
}

// ========================
// BASE MESSAGE INTERFACE
// ========================

export interface BaseMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  context?: {
    message_id: string;
  };
}

// ========================
// TEXT MESSAGES
// ========================

export interface TextMessage extends BaseMessage {
  type: WhatsAppMessageType.TEXT;
  text: {
    body: string;
    preview_url?: boolean;
  };
}

// ========================
// MEDIA MESSAGES
// ========================

export interface MediaMessage extends BaseMessage {
  type: WhatsAppMessageType.IMAGE | WhatsAppMessageType.VIDEO | WhatsAppMessageType.AUDIO | WhatsAppMessageType.DOCUMENT;
  [key: string]: any; 
}

export interface ImageMessage extends BaseMessage {
  type: WhatsAppMessageType.IMAGE;
  image: {
    id?: string;
    link?: string;
    caption?: string;
  };
}

export interface VideoMessage extends BaseMessage {
  type: WhatsAppMessageType.VIDEO;
  video: {
    id?: string;
    link?: string;
    caption?: string;
  };
}

export interface AudioMessage extends BaseMessage {
  type: WhatsAppMessageType.AUDIO;
  audio: {
    id?: string;
    link?: string;
  };
}

export interface DocumentMessage extends BaseMessage {
  type: WhatsAppMessageType.DOCUMENT;
  document: {
    id?: string;
    link?: string;
    caption?: string;
    filename: string;
  };
}

// ========================
// INTERACTIVE MESSAGES
// ========================

export interface InteractiveMessage extends BaseMessage {
  type: WhatsAppMessageType.INTERACTIVE;
  interactive: {
    type: 'button' | 'list' | 'flow';
    header?: {
      type: 'text' | 'image' | 'video' | 'document';
      text?: string;
      image?: { id: string };
      video?: { id: string };
      document?: { id: string; filename?: string };
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: ButtonAction | ListAction | FlowAction;
  };
}

export interface ButtonAction {
  buttons: Array<{
    type: 'reply';
    reply: {
      id: string;
      title: string;
    };
  }>;
}

export interface ListAction {
  button: string;
  sections: Array<{
    title?: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
}

export interface FlowAction {
  name: 'flow';
  parameters: {
    flow_message_version: string;
    flow_token: string;
    flow_id: string;
    flow_cta: string;
    flow_action: string;
    flow_action_payload: {
      screen: string;
      data?: any;
    };
  };
}

// ========================
// TEMPLATE MESSAGES
// ========================

export interface TemplateMessage extends BaseMessage {
  type: WhatsAppMessageType.TEMPLATE;
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      sub_type?: string;
      index?: string;
      parameters?: Array<{
        type: string;
        text?: string;
        image?: { link: string };
        video?: { link: string };
        document?: { link: string; filename?: string };
      }>;
    }>;
  };
}

// ========================
// LOCATION MESSAGES
// ========================

export interface LocationMessage extends BaseMessage {
  type: WhatsAppMessageType.LOCATION;
  location: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}

// ========================
// CONTACTS MESSAGES
// ========================

export interface ContactMessage extends BaseMessage {
  type: WhatsAppMessageType.CONTACTS;
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
    birthday?: string; // YYYY-MM-DD format
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
  }>;
}

// ========================
// STICKER MESSAGES
// ========================

export interface StickerMessage extends BaseMessage {
  type: WhatsAppMessageType.STICKER;
  sticker: {
    id?: string;
    link?: string;
  };
}

// ========================
// REACTION MESSAGES
// ========================

export interface ReactionMessage extends BaseMessage {
  type: WhatsAppMessageType.REACTION;
  reaction: {
    message_id: string;
    emoji: string;
  };
}

export interface ReactionResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Common emoji constants for convenience
export const REACTION_EMOJIS = {
  LIKE: '👍',
  LOVE: '❤️', 
  LAUGH: '😂',
  WOW: '😮',
  SAD: '😢',
  ANGRY: '😠',
  THUMBS_UP: '👍',
  THUMBS_DOWN: '👎',
  HEART: '❤️',
  HEART_EYES: '😍',
  FIRE: '🔥',
  CLAP: '👏',
  CHECK: '✅',
  CROSS: '❌'
} as const;

export type ReactionEmoji = typeof REACTION_EMOJIS[keyof typeof REACTION_EMOJIS] | string;

// ========================
// TYPING INDICATORS & READ RECEIPTS
// ========================

export interface TypingIndicatorMessage {
  messaging_product: 'whatsapp';
  recipient_type?: 'individual';
  to: string;
  message_id?: string;
  typing_indicator: {
    type: 'text';
  };
}

export interface ReadReceiptMessage {
  messaging_product: 'whatsapp';
  status: 'read';
  message_id: string;
}

export interface TypingIndicatorResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ========================
// WEBHOOK TYPES
// ========================

export interface IncomingMessage {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        messages?: Array<{
          id: string;
          from: string;
          timestamp: string;
          type: WhatsAppMessageType;
          text?: { body: string };
          image?: { id: string; mime_type: string; sha256: string; caption?: string };
          audio?: { id: string; mime_type: string };
          video?: { id: string; mime_type: string; caption?: string };
          document?: { id: string; mime_type: string; filename: string; caption?: string };
          location?: { latitude: number; longitude: number; name?: string; address?: string };
          interactive?: {
            type: string;
            button_reply?: { id: string; title: string };
            list_reply?: { id: string; title: string; description?: string };
            nfm_reply?: { response_json: string; body: string; name: string };
          };
          button?: { text: string; payload: string };
        }>;
        contacts?: Array<{
          profile: {
            name: string;
          };
        }>;
        statuses?: Array<{
          id: string;
          status: string;
          timestamp: string;
          recipient_id: string;
        }>;
      };
    }>;
  }>;
}

export interface ProcessedIncomingMessage {
  id: string;
  from: string;
  timestamp: string;
  type: WhatsAppMessageType;
  text?: string;
  media?: {
    id: string;
    mime_type: string;
    caption?: string;
    filename?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  interactive?: {
    type: string;
    button_id?: string;
    list_id?: string;
    flow_response?: any;
  };
  contact?: {
    name: string;
  };
  phoneNumberId: string;
  businessId: string;
}

// ========================
// WEBHOOK HANDLER TYPES
// ========================

export interface WebhookHandlers {
  onTextMessage?: (message: ProcessedIncomingMessage & { text: string }) => Promise<void> | void;
  onImageMessage?: (message: ProcessedIncomingMessage & { media: NonNullable<ProcessedIncomingMessage['media']> }) => Promise<void> | void;
  onVideoMessage?: (message: ProcessedIncomingMessage & { media: NonNullable<ProcessedIncomingMessage['media']> }) => Promise<void> | void;
  onAudioMessage?: (message: ProcessedIncomingMessage & { media: NonNullable<ProcessedIncomingMessage['media']> }) => Promise<void> | void;
  onDocumentMessage?: (message: ProcessedIncomingMessage & { media: NonNullable<ProcessedIncomingMessage['media']> }) => Promise<void> | void;
  onLocationMessage?: (message: ProcessedIncomingMessage & { location: NonNullable<ProcessedIncomingMessage['location']> }) => Promise<void> | void;
  onButtonClick?: (message: ProcessedIncomingMessage & { interactive: NonNullable<ProcessedIncomingMessage['interactive']> }) => Promise<void> | void;
  onListSelect?: (message: ProcessedIncomingMessage & { interactive: NonNullable<ProcessedIncomingMessage['interactive']> }) => Promise<void> | void;
  onStickerMessage?: (message: ProcessedIncomingMessage & { media: NonNullable<ProcessedIncomingMessage['media']> }) => Promise<void> | void;
  onContactMessage?: (message: ProcessedIncomingMessage) => Promise<void> | void;
  onUnknownMessage?: (message: ProcessedIncomingMessage) => Promise<void> | void;
  onError?: (error: Error, message?: ProcessedIncomingMessage) => Promise<void> | void;
}

export interface WebhookProcessorConfig {
  verifyToken: string;
  handlers: WebhookHandlers;
  autoRespond?: boolean;
}

export interface WebhookProcessorResult {
  status: number;
  response: string | number;
  messages?: ProcessedIncomingMessage[];
}

// ========================
// ERROR TYPES
// ========================

export interface WhatsAppError {
  message: string;
  type: string;
  code: number;
  error_data?: {
    messaging_product: string;
    details: string;
  };
  fbtrace_id?: string;
}

export interface ApiError extends Error {
  status?: number;
  response?: {
    data?: {
      error?: WhatsAppError;
    };
  };
}

// ========================
// UNION TYPES
// ========================

export type OutgoingMessage = 
  | TextMessage 
  | ImageMessage 
  | VideoMessage 
  | AudioMessage 
  | DocumentMessage 
  | InteractiveMessage 
  | TemplateMessage 
  | LocationMessage
  | ContactMessage
  | StickerMessage
  | ReactionMessage;

export type MessageContent = {
  text?: string;
  media?: Buffer;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  interactive?: any;
};