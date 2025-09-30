/**
 * WhatsApp Business API SDK
 * 
 * Easy-to-use TypeScript SDK for WhatsApp Business API
 * 
 * @example
 * ```typescript
 * import { WhatsAppClient } from 'whatsapp-client-sdk';
 * 
 * const client = new WhatsAppClient({
 *   accessToken: 'your-access-token',
 *   phoneNumberId: 'your-phone-number-id'
 * });
 * 
 * // Send a text message
 * await client.sendText('+1234567890', 'Hello World!');
 * 
 * // Send an image
 * await client.sendImage('+1234567890', {
 *   link: 'https://example.com/image.jpg',
 *   caption: 'Check this out!'
 * });
 * 
 * // Show typing indicator
 * await client.sendTypingIndicator('+1234567890');
 * 
 * // Mark message as read
 * await client.markMessageAsRead('message-id');
 * 
 * // Handle webhooks
 * const messages = client.parseWebhook(webhookPayload);
 * ```
 */

export { WhatsAppClient } from './client';

export * from './types';

export * from './errors';

export * from './webhooks';

export * from './storage';

export {
  formatPhoneNumber,
  validatePhoneNumber,
  isValidUrl,
  truncateText,
  escapeWhatsAppText
} from './utils';

export const VERSION = '1.5.3';

export { WhatsAppClient as default } from './client';