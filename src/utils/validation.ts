import { MessageValidationError, ConfigurationError } from '../errors';
import { OutgoingMessage, WhatsAppConfig } from '../types';
import { StorageConfig } from '../interfaces/StorageConfig';


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

  if (config.accessToken.length < 20) {
    throw new ConfigurationError(
      'Invalid access token: token is too short (minimum 20 characters)'
    );
  }

  if (/\s/.test(config.accessToken) || /[\x00-\x1F\x7F]/.test(config.accessToken)) {
    throw new ConfigurationError(
      'Invalid access token: token contains invalid characters (whitespace or control characters)'
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
      if ('image' in message) {
        const imageMsg = message as { image?: { id?: string; link?: string } };
        if (!imageMsg.image?.id && !imageMsg.image?.link) {
          throw new MessageValidationError(
            'Image message must have either id or link',
            'image'
          );
        }
      }
      break;
    }

    case 'template': {
      if ('template' in message) {
        const templateMsg = message as { template?: { name?: string; language?: { code?: string } } };
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
      }
      break;
    }

    case 'interactive': {
      if ('interactive' in message) {
        const interactiveMsg = message as { interactive?: { type?: string; body?: { text?: string } } };
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
  return text
    .replace(/[\u0000-\u001F\u007F]/g, '') // eslint-disable-line no-control-regex
    .trim()
    .slice(0, 4096);
}

export function validateStorageConfig(config: StorageConfig): void {
  if (!config.enabled) {
    return;
  }

  const errors: string[] = [];

  if (!config.provider) {
    errors.push('Storage provider is required when storage is enabled');
  } else if (!['supabase', 'custom'].includes(config.provider)) {
    errors.push('Storage provider must be either "supabase" or "custom"');
  }

  if (config.provider === 'supabase') {
    const supabaseOptions = config.options as any;
    if (!supabaseOptions) {
      errors.push('Supabase options are required');
    } else {
      if (!supabaseOptions.url) {
        errors.push('Supabase URL is required');
      } else if (!supabaseOptions.url.startsWith('https://')) {
        errors.push('Supabase URL must be a valid HTTPS URL');
      }

      if (!supabaseOptions.apiKey) {
        errors.push('Supabase API key is required');
      } else if (supabaseOptions.apiKey.length < 10) {
        errors.push('Supabase API key appears to be invalid (too short)');
      }

      if (supabaseOptions.schema && typeof supabaseOptions.schema !== 'string') {
        errors.push('Supabase schema must be a string');
      }

      if (supabaseOptions.tablePrefix && typeof supabaseOptions.tablePrefix !== 'string') {
        errors.push('Supabase table prefix must be a string');
      }
    }
  } else if (config.provider === 'custom') {
    const customOptions = config.options as any;
    if (!customOptions?.customAdapter) {
      errors.push('Custom adapter is required for custom storage provider');
    }
  }

  if (!config.features) {
    errors.push('Storage features configuration is required');
  } else {
    const features = config.features;

    const booleanFeatures = ['persistIncoming', 'persistOutgoing', 'persistStatus', 'autoConversations', 'persistMedia', 'createThreads', 'enableSearch'];
    booleanFeatures.forEach(feature => {
      if (features[feature as keyof typeof features] !== undefined && typeof features[feature as keyof typeof features] !== 'boolean') {
        errors.push(`Feature ${feature} must be a boolean`);
      }
    });

    if (features.retentionDays !== undefined) {
      if (typeof features.retentionDays !== 'number' || features.retentionDays <= 0) {
        errors.push('Retention days must be a positive number');
      }
    }

    if (features.anonymizeData !== undefined && typeof features.anonymizeData !== 'boolean') {
      errors.push('anonymizeData feature must be a boolean');
    }
  }

  if (errors.length > 0) {
    throw new ConfigurationError(
      'Invalid storage configuration',
      errors
    );
  }
}

