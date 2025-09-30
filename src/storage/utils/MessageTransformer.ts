import {
  MessageTransformer,
  MessageEntity,
  MessageContent
} from '../interfaces/StorageTypes';
import { MessageDirection } from '../../types';
import { ProcessedIncomingMessage, OutgoingMessage, WhatsAppMessageType } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { ConversationIdGenerator } from './ConversationIdGenerator';

export class DefaultIncomingTransformer implements MessageTransformer {
  name = 'default-incoming';

  transformIncoming = async (message: ProcessedIncomingMessage): Promise<MessageEntity> => {
    const now = new Date();

    return {
      id: uuidv4(),
      whatsappMessageId: message.id,
      conversationId: ConversationIdGenerator.generate(message.from, message.phoneNumberId),
      phoneNumberId: message.phoneNumberId,
      fromPhone: message.from,
      toPhone: message.phoneNumberId,
      messageType: message.type,
      content: this.extractMessageContent(message),
      whatsappReplyToId: message.context?.message_id,
      timestamp: new Date(parseInt(message.timestamp) * 1000),
      status: 'delivered' as any,
      direction: MessageDirection.INCOMING,
      metadata: {
        businessId: message.businessId,
        contact: message.contact
      },
      createdAt: now,
      updatedAt: now
    };
  };

  private extractMessageContent(message: ProcessedIncomingMessage): MessageContent {
    const content: MessageContent = {};

    if (message.text) {
      content.text = message.text;
    }

    if (message.media) {
      content.media = {
        id: message.media.id,
        mimeType: message.media.mime_type,
        filename: message.media.filename,
        caption: message.media.caption
      };
    }

    if (message.location) {
      content.location = message.location;
    }

    if (message.interactive) {
      content.interactive = message.interactive;
    }

    if (message.reaction) {
      content.reaction = {
        messageId: message.reaction.message_id,
        emoji: message.reaction.emoji
      };
    }

    return content;
  }

}

export class DefaultOutgoingTransformer implements MessageTransformer {
  name = 'default-outgoing';

  transformOutgoing = async (message: OutgoingMessage & { messageId?: string, businessPhoneId?: string }): Promise<MessageEntity> => {
    const now = new Date();

    // For outgoing messages, we need the business phone ID as the sender
    const businessPhoneId = message.businessPhoneId || 'UNKNOWN_BUSINESS_PHONE';

    return {
      id: uuidv4(),
      whatsappMessageId: message.messageId || uuidv4(),
      conversationId: ConversationIdGenerator.generate(message.to, businessPhoneId),
      phoneNumberId: businessPhoneId,
      fromPhone: businessPhoneId,
      toPhone: message.to,
      messageType: message.type,
      content: this.extractOutgoingContent(message),
      whatsappReplyToId: message.context?.message_id,
      timestamp: now,
      status: 'sent' as any,
      direction: MessageDirection.OUTGOING,
      metadata: {
        originalMessage: message
      },
      createdAt: now,
      updatedAt: now
    };
  };

  private extractOutgoingContent(message: OutgoingMessage): MessageContent {
    const content: MessageContent = {};

    switch (message.type) {
      case WhatsAppMessageType.TEXT:
        if ('text' in message) {
          content.text = message.text.body;
        }
        break;

      case WhatsAppMessageType.IMAGE:
        if ('image' in message) {
          content.media = {
            id: message.image.id || '',
            mimeType: 'image/*',
            caption: message.image.caption,
            url: message.image.link
          };
        }
        break;

      case WhatsAppMessageType.VIDEO:
        if ('video' in message) {
          content.media = {
            id: message.video.id || '',
            mimeType: 'video/*',
            caption: message.video.caption,
            url: message.video.link
          };
        }
        break;

      case WhatsAppMessageType.AUDIO:
        if ('audio' in message) {
          content.media = {
            id: message.audio.id || '',
            mimeType: 'audio/*',
            url: message.audio.link
          };
        }
        break;

      case WhatsAppMessageType.DOCUMENT:
        if ('document' in message) {
          content.media = {
            id: message.document.id || '',
            mimeType: 'application/*',
            filename: message.document.filename,
            caption: message.document.caption,
            url: message.document.link
          };
        }
        break;

      case WhatsAppMessageType.LOCATION:
        if ('location' in message) {
          content.location = message.location;
        }
        break;

      case WhatsAppMessageType.INTERACTIVE:
        if ('interactive' in message) {
          content.interactive = {
            ...message.interactive,
            type: message.interactive.type
          };
        }
        break;

      case WhatsAppMessageType.CONTACTS:
        if ('contacts' in message) {
          content.contacts = message.contacts.map(contact => ({
            name: contact.name.formatted_name,
            phone: contact.phones?.[0]?.phone,
            email: contact.emails?.[0]?.email
          }));
        }
        break;

      case WhatsAppMessageType.STICKER:
        if ('sticker' in message) {
          content.media = {
            id: message.sticker.id || '',
            mimeType: 'image/webp',
            url: message.sticker.link
          };
        }
        break;

      case WhatsAppMessageType.REACTION:
        if ('reaction' in message) {
          content.reaction = {
            messageId: message.reaction.message_id,
            emoji: message.reaction.emoji
          };
        }
        break;
    }

    return content;
  }

}

export class MetadataEnricherTransformer implements MessageTransformer {
  name = 'metadata-enricher';
  private enricher: (message: ProcessedIncomingMessage | MessageEntity) => Record<string, any>;

  constructor(enricher: (message: ProcessedIncomingMessage | MessageEntity) => Record<string, any>) {
    this.enricher = enricher;
  }

  transformIncoming = async (message: ProcessedIncomingMessage): Promise<MessageEntity> => {
    const defaultTransformer = new DefaultIncomingTransformer();
    const entity = await defaultTransformer.transformIncoming!(message);

    entity.metadata = {
      ...entity.metadata,
      ...this.enricher(message)
    };

    return entity;
  };
}

export class AnonymizingTransformer implements MessageTransformer {
  name = 'anonymizing';

  transformIncoming = async (message: ProcessedIncomingMessage): Promise<MessageEntity> => {
    const defaultTransformer = new DefaultIncomingTransformer();
    const entity = await defaultTransformer.transformIncoming!(message);

    entity.fromPhone = this.anonymizePhone(entity.fromPhone);
    entity.toPhone = this.anonymizePhone(entity.toPhone);

    return entity;
  };

  transformOutgoing = async (message: any): Promise<MessageEntity> => {
    const defaultTransformer = new DefaultOutgoingTransformer();
    const entity = await defaultTransformer.transformOutgoing!(message);

    entity.fromPhone = this.anonymizePhone(entity.fromPhone);
    entity.toPhone = this.anonymizePhone(entity.toPhone);

    return entity;
  };

  private anonymizePhone(phone: string): string {
    const normalized = phone.replace(/^\+/, '');
    const visible = normalized.slice(-4);
    const hidden = '*'.repeat(Math.max(0, normalized.length - 4));
    return hidden + visible;
  }
}


export class ContentFilterTransformer implements MessageTransformer {
  name = 'content-filter';
  private sensitivePatterns: RegExp[];

  constructor(patterns: (string | RegExp)[] = []) {
    this.sensitivePatterns = patterns.map(p =>
      typeof p === 'string' ? new RegExp(p, 'gi') : p
    );
  }

  transformIncoming = async (message: ProcessedIncomingMessage): Promise<MessageEntity> => {
    const defaultTransformer = new DefaultIncomingTransformer();
    const entity = await defaultTransformer.transformIncoming!(message);

    if (entity.content.text) {
      entity.content.text = this.filterText(entity.content.text);
    }

    if (entity.content.media?.caption) {
      entity.content.media.caption = this.filterText(entity.content.media.caption);
    }

    return entity;
  };

  private filterText(text: string): string {
    let filtered = text;

    this.sensitivePatterns.forEach(pattern => {
      filtered = filtered.replace(pattern, '[FILTERED]');
    });

    return filtered;
  }
}

export class LocationContextTransformer implements MessageTransformer {
  name = 'location-context';

  transformIncoming = async (message: ProcessedIncomingMessage): Promise<MessageEntity> => {
    const defaultTransformer = new DefaultIncomingTransformer();
    const entity = await defaultTransformer.transformIncoming!(message);

    if (entity.content.location) {
      entity.metadata = {
        ...entity.metadata,
        locationContext: await this.enrichLocation(entity.content.location)
      };
    }

    return entity;
  };

  private async enrichLocation(location: any): Promise<Record<string, any>> {

    return {
      coordinates: {
        lat: location.latitude,
        lng: location.longitude
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export class CompositeTransformer implements MessageTransformer {
  name = 'composite';
  private transformers: MessageTransformer[];

  constructor(transformers: MessageTransformer[]) {
    this.transformers = transformers;
  }

  transformIncoming = async (message: ProcessedIncomingMessage): Promise<MessageEntity> => {
    let entity: MessageEntity;


    if (this.transformers[0]?.transformIncoming) {
      entity = await this.transformers[0].transformIncoming(message);
    } else {
      const defaultTransformer = new DefaultIncomingTransformer();
      entity = await defaultTransformer.transformIncoming(message);
    }

    for (let i = 1; i < this.transformers.length; i++) {
      const transformer = this.transformers[i];
      if (transformer.transformIncoming) {
        const updatedEntity = await transformer.transformIncoming(message);

        entity = {
          ...entity,
          ...updatedEntity,
          metadata: {
            ...entity.metadata,
            ...updatedEntity.metadata
          }
        };
      }
    }

    return entity;
  };

  transformOutgoing = async (message: any): Promise<MessageEntity> => {
    let entity: MessageEntity;

    if (this.transformers[0]?.transformOutgoing) {
      entity = await this.transformers[0].transformOutgoing(message);
    } else {
      const defaultTransformer = new DefaultOutgoingTransformer();
      entity = await defaultTransformer.transformOutgoing(message);
    }

    for (let i = 1; i < this.transformers.length; i++) {
      const transformer = this.transformers[i];
      if (transformer.transformOutgoing) {
        const updatedEntity = await transformer.transformOutgoing(message);

        entity = {
          ...entity,
          ...updatedEntity,
          metadata: {
            ...entity.metadata,
            ...updatedEntity.metadata
          }
        };
      }
    }

    return entity;
  };
}

export class TransformerFactory {
  static createDefault(): MessageTransformer[] {
    return [
      new DefaultIncomingTransformer(),
      new DefaultOutgoingTransformer()
    ];
  }

  static createWithAnonymization(): MessageTransformer[] {
    return [
      new AnonymizingTransformer()
    ];
  }

  static createWithContentFilter(patterns: (string | RegExp)[]): MessageTransformer[] {
    return [
      new ContentFilterTransformer(patterns)
    ];
  }

  static createEnriched(enricher: (message: any) => Record<string, any>): MessageTransformer[] {
    return [
      new MetadataEnricherTransformer(enricher)
    ];
  }

  static createComposite(...transformers: MessageTransformer[]): CompositeTransformer {
    return new CompositeTransformer(transformers);
  }
}