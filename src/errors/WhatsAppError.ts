/**
 * Custom error classes for WhatsApp Business API SDK
 */

import { WhatsAppError as IWhatsAppError, OutgoingMessage } from '../types';

/**
 * Base WhatsApp API Error
 */
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
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WhatsAppApiError);
    }
  }
}

/**
 * Configuration Error - thrown when SDK is misconfigured
 */
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

/**
 * Webhook Verification Error
 */
export class WebhookVerificationError extends Error {
  constructor(message: string = 'Webhook verification failed') {
    super(message);
    this.name = 'WebhookVerificationError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WebhookVerificationError);
    }
  }
}

/**
 * Media Processing Error
 */
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

/**
 * Rate Limit Error
 */
export class RateLimitError extends WhatsAppApiError {
  public readonly retryAfter?: number;
  
  constructor(message: string, retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Message Validation Error
 */
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