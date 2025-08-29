
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
// TEXT MESSAGES
// ========================

export interface TextMessage {
  type: WhatsAppMessageType.TEXT;
  to: string;
  text: {
    body: string;
    preview_url?: boolean;
  };
  context?: {
    message_id: string;
  };
}

// ========================
// MEDIA MESSAGES
// ========================

export interface MediaMessage {
  type: WhatsAppMessageType.IMAGE | WhatsAppMessageType.VIDEO | WhatsAppMessageType.AUDIO | WhatsAppMessageType.DOCUMENT;
  to: string;
  [key: string]: any; 
  context?: {
    message_id: string;
  };
}

export interface ImageMessage extends MediaMessage {
  type: WhatsAppMessageType.IMAGE;
  image: {
    id?: string;
    link?: string;
    caption?: string;
  };
}

export interface VideoMessage extends MediaMessage {
  type: WhatsAppMessageType.VIDEO;
  video: {
    id?: string;
    link?: string;
    caption?: string;
  };
}

export interface AudioMessage extends MediaMessage {
  type: WhatsAppMessageType.AUDIO;
  audio: {
    id?: string;
    link?: string;
  };
}

export interface DocumentMessage extends MediaMessage {
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

export interface InteractiveMessage {
  type: WhatsAppMessageType.INTERACTIVE;
  to: string;
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
  context?: {
    message_id: string;
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

export interface TemplateMessage {
  type: WhatsAppMessageType.TEMPLATE;
  to: string;
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

export interface LocationMessage {
  type: WhatsAppMessageType.LOCATION;
  to: string;
  location: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  context?: {
    message_id: string;
  };
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
  | LocationMessage;

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