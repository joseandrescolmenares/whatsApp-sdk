
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