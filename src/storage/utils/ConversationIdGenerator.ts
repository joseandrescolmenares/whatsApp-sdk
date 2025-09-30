
export class ConversationIdGenerator {

  static generate(phoneNumber: string, businessPhoneId: string): string {
    const key = [phoneNumber, businessPhoneId].sort().join(':');

    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    return [
      hash.substring(0, 8),
      hash.substring(8, 12),
      hash.substring(12, 16),
      hash.substring(16, 20),
      hash.substring(20, 32)
    ].join('-');
  }
}