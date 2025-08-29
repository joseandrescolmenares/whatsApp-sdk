/**
 * WhatsApp Business API SDK
 * 
 * Easy-to-use TypeScript SDK for WhatsApp Business API
 * 
 * @example
 * ```typescript
 * import { WhatsAppClient } from 'whatsapp-sdk';
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
 * // Handle webhooks
 * const messages = client.parseWebhook(webhookPayload);
 * ```
 */

// Main client
export { WhatsAppClient } from './client';

// Types
export * from './types';

// Errors
export * from './errors';

// Utilities (selective export for public API)
export {
  formatPhoneNumber,
  validatePhoneNumber,
  isValidUrl,
  truncateText,
  escapeWhatsAppText
} from './utils';

// Version
export const VERSION = '1.0.0';

// Default export for convenience
export { WhatsAppClient as default } from './client';