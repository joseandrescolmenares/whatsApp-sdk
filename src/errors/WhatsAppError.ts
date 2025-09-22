
import { WhatsAppError as IWhatsAppError, OutgoingMessage } from '../types';

export class WhatsAppApiError extends Error {
  public readonly status: number;
  public readonly code: number;
  public readonly type: string;
  public readonly details: string;
  public readonly fbtrace_id?: string;
  public readonly originalMessage?: OutgoingMessage;

  constructor(
    message: string,
    errorData?: IWhatsAppError,
    originalMessage?: OutgoingMessage,
    status: number = 400
  ) {
    super(message);
    this.name = 'WhatsAppApiError';
    this.status = status;
    this.code = errorData?.code || 0;
    this.type = errorData?.type || 'unknown';
    this.details = errorData?.error_data?.details || 'No details provided';
    this.fbtrace_id = errorData?.fbtrace_id;
    this.originalMessage = originalMessage;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WhatsAppApiError);
    }
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, missingFields?: string[]) {
    const fullMessage = missingFields
      ? `${message}. Missing: ${missingFields.join(', ')}`
      : message;
    
    super(fullMessage);
    this.name = 'ConfigurationError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConfigurationError);
    }
  }
}

export class WebhookVerificationError extends Error {
  constructor(message: string = 'Webhook verification failed') {
    super(message);
    this.name = 'WebhookVerificationError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WebhookVerificationError);
    }
  }
}

export class MediaProcessingError extends Error {
  public readonly mediaId?: string;
  
  constructor(message: string, mediaId?: string) {
    super(message);
    this.name = 'MediaProcessingError';
    this.mediaId = mediaId;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MediaProcessingError);
    }
  }
}

export class RateLimitError extends WhatsAppApiError {
  public readonly retryAfter?: number;
  
  constructor(message: string, retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class MessageValidationError extends Error {
  public readonly field: string;

  constructor(message: string, field: string) {
    super(message);
    this.name = 'MessageValidationError';
    this.field = field;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MessageValidationError);
    }
  }
}

// Error codes for better categorization
export enum WhatsAppErrorCode {
  // Configuration errors (1000-1099)
  MISSING_ACCESS_TOKEN = 1001,
  MISSING_PHONE_NUMBER_ID = 1002,
  MISSING_WEBHOOK_TOKEN = 1003,
  INVALID_CONFIGURATION = 1004,

  // API errors (2000-2099)
  API_REQUEST_FAILED = 2001,
  INVALID_PHONE_NUMBER = 2002,
  MESSAGE_TOO_LONG = 2003,
  UNSUPPORTED_MESSAGE_TYPE = 2004,
  TEMPLATE_NOT_FOUND = 2005,
  INVALID_MEDIA_ID = 2006,

  // Webhook errors (3000-3099)
  WEBHOOK_VERIFICATION_FAILED = 3001,
  WEBHOOK_PARSING_FAILED = 3002,
  WEBHOOK_HANDLER_ERROR = 3003,
  INVALID_WEBHOOK_PAYLOAD = 3004,

  // Media errors (4000-4099)
  MEDIA_UPLOAD_FAILED = 4001,
  MEDIA_DOWNLOAD_FAILED = 4002,
  MEDIA_TOO_LARGE = 4003,
  UNSUPPORTED_MEDIA_TYPE = 4004,

  // Rate limit errors (5000-5099)
  RATE_LIMIT_EXCEEDED = 5001,
  QUOTA_EXCEEDED = 5002,

  // Business verification errors (6000-6099)
  BUSINESS_NOT_VERIFIED = 6001,
  PHONE_NUMBER_NOT_VERIFIED = 6002,

  // Buffer/Processing errors (7000-7099)
  BUFFER_OVERFLOW = 7001,
  MESSAGE_PROCESSING_FAILED = 7002,
  HANDLER_EXECUTION_FAILED = 7003
}

export interface ErrorContext {
  timestamp: number;
  operation: string;
  phoneNumber?: string;
  messageId?: string;
  mediaId?: string;
  requestId?: string;
  additionalData?: Record<string, any>;
}

export class EnhancedWhatsAppError extends Error {
  public readonly code: WhatsAppErrorCode;
  public readonly context: ErrorContext;
  public readonly originalError?: Error;
  public readonly suggestions: string[];

  constructor(
    message: string,
    code: WhatsAppErrorCode,
    context: Partial<ErrorContext> = {},
    originalError?: Error,
    suggestions: string[] = []
  ) {
    super(message);
    this.name = 'EnhancedWhatsAppError';
    this.code = code;
    this.context = {
      timestamp: Date.now(),
      operation: 'unknown',
      ...context
    };
    this.originalError = originalError;
    this.suggestions = suggestions;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnhancedWhatsAppError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      suggestions: this.suggestions,
      stack: this.stack,
      originalError: this.originalError?.message
    };
  }

  toString() {
    const contextStr = Object.entries(this.context)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    let result = `${this.name} [${this.code}]: ${this.message}`;
    if (contextStr) {
      result += `\nContext: ${contextStr}`;
    }
    if (this.suggestions.length > 0) {
      result += `\nSuggestions:\n${this.suggestions.map(s => `  • ${s}`).join('\n')}`;
    }
    return result;
  }
}

export class WebhookProcessingError extends EnhancedWhatsAppError {
  constructor(
    message: string,
    context: Partial<ErrorContext> = {},
    originalError?: Error
  ) {
    const suggestions = [
      'Check if the webhook payload is properly formatted',
      'Verify that your handlers can process the message type',
      'Check the webhook logs for more details',
      'Ensure your server can handle the incoming webhook volume'
    ];

    super(
      message,
      WhatsAppErrorCode.WEBHOOK_HANDLER_ERROR,
      { operation: 'webhook_processing', ...context },
      originalError,
      suggestions
    );
    this.name = 'WebhookProcessingError';
  }
}

export class BufferError extends EnhancedWhatsAppError {
  constructor(
    message: string,
    context: Partial<ErrorContext> = {},
    originalError?: Error
  ) {
    const suggestions = [
      'Consider reducing bufferTimeMs or maxBatchSize',
      'Check if your handlers can process message arrays',
      'Monitor memory usage during high message volume',
      'Implement proper error handling in message handlers'
    ];

    super(
      message,
      WhatsAppErrorCode.BUFFER_OVERFLOW,
      { operation: 'message_buffering', ...context },
      originalError,
      suggestions
    );
    this.name = 'BufferError';
  }
}

export class ApiRequestError extends EnhancedWhatsAppError {
  public readonly status: number;
  public readonly response?: any;

  constructor(
    message: string,
    status: number,
    code: WhatsAppErrorCode,
    context: Partial<ErrorContext> = {},
    response?: any,
    originalError?: Error
  ) {
    const suggestions = ApiRequestError.getSuggestions(status, code);

    super(
      message,
      code,
      { operation: 'api_request', ...context },
      originalError,
      suggestions
    );

    this.name = 'ApiRequestError';
    this.status = status;
    this.response = response;
  }

  private static getSuggestions(status: number, _code: WhatsAppErrorCode): string[] {
    const commonSuggestions = [
      'Check your access token and permissions',
      'Verify the phone number ID is correct',
      'Ensure the recipient number is valid'
    ];

    switch (status) {
      case 401:
        return [
          'Your access token may be expired or invalid',
          'Check if your app has the required permissions',
          'Regenerate your access token from Meta Business'
        ];
      case 403:
        return [
          'Your business account may not be verified',
          'Check if you have permission to message this number',
          'Verify your phone number is approved for sending'
        ];
      case 429:
        return [
          'You are being rate limited',
          'Implement exponential backoff in your requests',
          'Consider upgrading your rate limits with Meta'
        ];
      case 500:
        return [
          'WhatsApp API is experiencing issues',
          'Try again after a few minutes',
          'Check Meta\'s API status page'
        ];
      default:
        return commonSuggestions;
    }
  }
}