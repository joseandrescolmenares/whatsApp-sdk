import { MessageValidationError, ConfigurationError } from '../errors';
import { OutgoingMessage, WhatsAppConfig } from '../types';


export function validatePhoneNumber(phoneNumber: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
}


export function validateConfig(config: WhatsAppConfig): void {
  const missingFields: string[] = [];

  if (!config.accessToken) missingFields.push('accessToken');
  if (!config.phoneNumberId) missingFields.push('phoneNumberId');

  if (missingFields.length > 0) {
    throw new ConfigurationError(
      'Missing required configuration fields',
      missingFields
    );
  }

  if (!config.accessToken.match(/^[A-Za-z0-9_-]+$/)) {
    throw new ConfigurationError(
      'Invalid access token format'
    );
  }
}

export function validateMessage(message: OutgoingMessage): void {
  if (!message.to) {
    throw new MessageValidationError('Recipient phone number is required', 'to');
  }

  if (!validatePhoneNumber(message.to)) {
    throw new MessageValidationError(
      'Invalid phone number format. Must include country code.',
      'to'
    );
  }

  switch (message.type) {
    case 'text': {
      if (!message.text?.body) {
        throw new MessageValidationError('Text message body is required', 'text.body');
      }
      if (message.text.body.length > 4096) {
        throw new MessageValidationError(
          'Text message exceeds maximum length of 4096 characters',
          'text.body'
        );
      }
      break;
    }

    case 'image': {
      const imageMsg = message as any;
      if (!imageMsg.image?.id && !imageMsg.image?.link) {
        throw new MessageValidationError(
          'Image message must have either id or link',
          'image'
        );
      }
      break;
    }

    case 'template': {
      const templateMsg = message as any;
      if (!templateMsg.template?.name) {
        throw new MessageValidationError(
          'Template message must have a name',
          'template.name'
        );
      }
      if (!templateMsg.template?.language?.code) {
        throw new MessageValidationError(
          'Template message must have a language code',
          'template.language.code'
        );
      }
      break;
    }

    case 'interactive': {
      const interactiveMsg = message as any;
      if (!interactiveMsg.interactive?.type) {
        throw new MessageValidationError(
          'Interactive message must specify type',
          'interactive.type'
        );
      }
      if (!interactiveMsg.interactive?.body?.text) {
        throw new MessageValidationError(
          'Interactive message must have body text',
          'interactive.body.text'
        );
      }
      break;
    }
  }
}

export function validateMediaFile(buffer: Buffer, type: string): void {
  const maxSizes = {
    image: 5 * 1024 * 1024, // 5MB
    video: 16 * 1024 * 1024, // 16MB
    audio: 16 * 1024 * 1024, // 16MB
    document: 100 * 1024 * 1024 // 100MB
  };

  const maxSize = maxSizes[type as keyof typeof maxSizes];
  if (maxSize && buffer.length > maxSize) {
    throw new MessageValidationError(
      `${type} file exceeds maximum size of ${maxSize / (1024 * 1024)}MB`,
      'file'
    );
  }
}

export function sanitizeText(text: string): string {
  // Remove control characters (U+0000 to U+001F and U+007F)
  return text
    .replace(/[\u0000-\u001F\u007F]/g, '') // eslint-disable-line no-control-regex
    .trim()
    .slice(0, 4096);
}

