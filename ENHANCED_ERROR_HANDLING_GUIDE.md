# Enhanced Error Handling Guide

## Overview

WhatsApp Client SDK now provides comprehensive error handling with detailed context, specific error codes, and actionable suggestions. This guide explains how to use the enhanced error system for better debugging and user experience.

## Features

### 🔍 **Detailed Error Context**
- Operation details and timestamps
- Request/response information
- Phone numbers and message IDs
- Debugging metadata

### 📊 **Categorized Error Codes**
- Configuration errors (1000-1099)
- API errors (2000-2099)
- Webhook errors (3000-3099)
- Media errors (4000-4099)
- Rate limit errors (5000-5099)
- Business verification errors (6000-6099)
- Buffer/Processing errors (7000-7099)

### 💡 **Actionable Suggestions**
- Specific steps to resolve issues
- Context-aware recommendations
- Best practice guidance

## Enhanced Error Classes

### `EnhancedWhatsAppError` (Base Class)

```typescript
import { EnhancedWhatsAppError, WhatsAppErrorCode } from 'whatsapp-client-sdk';

// Basic usage
const error = new EnhancedWhatsAppError(
  'Message failed to send',
  WhatsAppErrorCode.API_REQUEST_FAILED,
  {
    phoneNumber: '+1234567890',
    messageId: 'msg_123',
    operation: 'send_message'
  }
);

console.log(error.toString());
// EnhancedWhatsAppError [2001]: Message failed to send
// Context: timestamp: 1640995200000, operation: send_message, phoneNumber: +1234567890, messageId: msg_123
// Suggestions:
//   • Check your access token and permissions
//   • Verify the phone number ID is correct
//   • Ensure the recipient number is valid
```

### `ApiRequestError` (API Failures)

```typescript
import { ApiRequestError, WhatsAppErrorCode } from 'whatsapp-client-sdk';

try {
  await client.sendText('+invalid', 'Hello');
} catch (error) {
  if (error instanceof ApiRequestError) {
    console.log(`Status: ${error.status}`);
    console.log(`Code: ${error.code}`);
    console.log(`Context:`, error.context);
    console.log(`Suggestions:`, error.suggestions);
    console.log(`Response:`, error.response);
  }
}
```

### `WebhookProcessingError` (Webhook Issues)

```typescript
import { WebhookProcessingError } from 'whatsapp-client-sdk';

const webhookProcessor = client.createWebhookProcessor({
  onTextMessage: async (messages) => {
    // Your handler logic
  },
  onError: async (error) => {
    if (error instanceof WebhookProcessingError) {
      console.log('Webhook processing failed:', error.toString());
      console.log('Operation:', error.context.operation);
      console.log('Suggestions:', error.suggestions);
    }
  }
});
```

### `BufferError` (Message Buffering Issues)

```typescript
import { BufferError } from 'whatsapp-client-sdk';

const webhookProcessor = client.createWebhookProcessor({
  enableBuffer: true,
  bufferTimeMs: 5000,
  maxBatchSize: 10,
  onTextMessage: async (messages) => {
    // Handler logic
  },
  onError: async (error) => {
    if (error instanceof BufferError) {
      console.log('Buffer overflow detected!');
      console.log('Phone number:', error.context.phoneNumber);
      console.log('Suggestions:', error.suggestions.join(', '));
    }
  }
});
```

## Error Code Reference

### Configuration Errors (1000-1099)
- `1001` - MISSING_ACCESS_TOKEN
- `1002` - MISSING_PHONE_NUMBER_ID
- `1003` - MISSING_WEBHOOK_TOKEN
- `1004` - INVALID_CONFIGURATION

### API Errors (2000-2099)
- `2001` - API_REQUEST_FAILED
- `2002` - INVALID_PHONE_NUMBER
- `2003` - MESSAGE_TOO_LONG
- `2004` - UNSUPPORTED_MESSAGE_TYPE
- `2005` - TEMPLATE_NOT_FOUND
- `2006` - INVALID_MEDIA_ID

### Webhook Errors (3000-3099)
- `3001` - WEBHOOK_VERIFICATION_FAILED
- `3002` - WEBHOOK_PARSING_FAILED
- `3003` - WEBHOOK_HANDLER_ERROR
- `3004` - INVALID_WEBHOOK_PAYLOAD

### Media Errors (4000-4099)
- `4001` - MEDIA_UPLOAD_FAILED
- `4002` - MEDIA_DOWNLOAD_FAILED
- `4003` - MEDIA_TOO_LARGE
- `4004` - UNSUPPORTED_MEDIA_TYPE

### Rate Limit Errors (5000-5099)
- `5001` - RATE_LIMIT_EXCEEDED
- `5002` - QUOTA_EXCEEDED

### Business Verification Errors (6000-6099)
- `6001` - BUSINESS_NOT_VERIFIED
- `6002` - PHONE_NUMBER_NOT_VERIFIED

### Buffer/Processing Errors (7000-7099)
- `7001` - BUFFER_OVERFLOW
- `7002` - MESSAGE_PROCESSING_FAILED
- `7003` - HANDLER_EXECUTION_FAILED

## Usage Examples

### Basic Error Handling

```typescript
import { WhatsAppClient, ApiRequestError, WhatsAppErrorCode } from 'whatsapp-client-sdk';

const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN!,
});

async function sendMessage() {
  try {
    await client.sendText('+1234567890', 'Hello World!');
  } catch (error) {
    if (error instanceof ApiRequestError) {
      switch (error.code) {
        case WhatsAppErrorCode.INVALID_PHONE_NUMBER:
          console.log('❌ Invalid phone number format');
          console.log('💡 Suggestions:', error.suggestions.join(', '));
          break;

        case WhatsAppErrorCode.RATE_LIMIT_EXCEEDED:
          console.log('⏳ Rate limited, retrying later...');
          console.log('⚠️ Context:', error.context);
          break;

        case WhatsAppErrorCode.BUSINESS_NOT_VERIFIED:
          console.log('🏢 Business account not verified');
          console.log('📋 Steps to resolve:', error.suggestions);
          break;

        default:
          console.log('❌ API Error:', error.message);
          console.log('🔍 Debug info:', error.toJSON());
      }
    } else {
      console.log('💥 Unexpected error:', error);
    }
  }
}
```

### Advanced Webhook Error Handling

```typescript
import {
  WhatsAppClient,
  WebhookProcessingError,
  BufferError,
  WhatsAppErrorCode
} from 'whatsapp-client-sdk';

const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN!,
});

const webhookProcessor = client.createWebhookProcessor({
  enableBuffer: true,
  bufferTimeMs: 10000,
  maxBatchSize: 50,

  onTextMessage: async (messages) => {
    if (Array.isArray(messages)) {
      console.log(`📦 Processing batch of ${messages.length} messages`);
      // Process batch
    } else {
      console.log(`📨 Processing single message: ${messages.text}`);
      // Process single message
    }
  },

  onError: async (error) => {
    console.log('\n🚨 Error occurred:');
    console.log('Type:', error.constructor.name);
    console.log('Message:', error.message);

    if (error instanceof BufferError) {
      console.log('📍 Buffer Error Details:');
      console.log('  Phone Number:', error.context.phoneNumber);
      console.log('  Operation:', error.context.operation);
      console.log('  Timestamp:', new Date(error.context.timestamp));

      console.log('\n💡 Suggestions:');
      error.suggestions.forEach(suggestion => {
        console.log(`  • ${suggestion}`);
      });

      // Handle buffer overflow
      if (error.code === WhatsAppErrorCode.BUFFER_OVERFLOW) {
        console.log('⚠️ Consider reducing buffer size or implementing backpressure');
      }

    } else if (error instanceof WebhookProcessingError) {
      console.log('📍 Webhook Processing Error Details:');
      console.log('  Operation:', error.context.operation);
      console.log('  Additional Data:', error.context.additionalData);

      if (error.originalError) {
        console.log('  Original Error:', error.originalError.message);
        console.log('  Stack Trace:', error.originalError.stack);
      }

    } else {
      console.log('📍 Generic Error:');
      console.log('  Stack:', error.stack);
    }

    // Log structured error for monitoring systems
    console.log('\n📊 Structured Error Data:');
    console.log(JSON.stringify({
      error: error.constructor.name,
      message: error.message,
      code: (error as any).code,
      context: (error as any).context,
      timestamp: new Date().toISOString()
    }, null, 2));
  }
});

// Express.js example
app.post('/webhook', async (req, res) => {
  try {
    const result = await webhookProcessor.processWebhook(req.body, {});
    res.status(result.status).send(result.response);
  } catch (error) {
    console.error('Webhook processing failed:', error);
    res.status(500).send('Internal Server Error');
  }
});
```

### Error Monitoring and Logging

```typescript
import {
  EnhancedWhatsAppError,
  ApiRequestError,
  WhatsAppErrorCode
} from 'whatsapp-client-sdk';

class ErrorLogger {
  static log(error: Error) {
    if (error instanceof EnhancedWhatsAppError) {
      // Send to monitoring service
      this.sendToMonitoring({
        service: 'whatsapp-sdk',
        error_type: error.constructor.name,
        error_code: error.code,
        message: error.message,
        context: error.context,
        suggestions: error.suggestions,
        timestamp: new Date().toISOString()
      });

      // Log to console with formatting
      console.log(`\n🚨 ${error.constructor.name} [${error.code}]`);
      console.log(`📝 ${error.message}`);
      console.log(`⏰ ${new Date(error.context.timestamp).toLocaleString()}`);

      if (error.context.phoneNumber) {
        console.log(`📞 Phone: ${error.context.phoneNumber}`);
      }

      if (error.context.operation) {
        console.log(`⚙️ Operation: ${error.context.operation}`);
      }

      console.log('\n💡 Suggestions:');
      error.suggestions.forEach(suggestion => {
        console.log(`  • ${suggestion}`);
      });

      // Critical errors need immediate attention
      if (this.isCritical(error.code)) {
        this.sendAlert(error);
      }
    } else {
      console.error('Unexpected error:', error);
    }
  }

  static isCritical(code: WhatsAppErrorCode): boolean {
    const criticalCodes = [
      WhatsAppErrorCode.MISSING_ACCESS_TOKEN,
      WhatsAppErrorCode.BUSINESS_NOT_VERIFIED,
      WhatsAppErrorCode.QUOTA_EXCEEDED,
      WhatsAppErrorCode.BUFFER_OVERFLOW
    ];
    return criticalCodes.includes(code);
  }

  static sendToMonitoring(data: any) {
    // Implement your monitoring service integration
    // e.g., Sentry, DataDog, New Relic, etc.
  }

  static sendAlert(error: EnhancedWhatsAppError) {
    // Implement alerting (Slack, email, etc.)
    console.log('🚨 CRITICAL ERROR ALERT:', error.message);
  }
}

// Usage in your application
try {
  await client.sendText('+1234567890', 'Hello');
} catch (error) {
  ErrorLogger.log(error);
}
```

## Migration Guide

### Before (Old Error Handling)

```typescript
try {
  await client.sendText('+1234567890', 'Hello');
} catch (error) {
  console.log('Error:', error.message); // Generic message
  // Limited debugging information
}
```

### After (Enhanced Error Handling)

```typescript
try {
  await client.sendText('+1234567890', 'Hello');
} catch (error) {
  if (error instanceof ApiRequestError) {
    console.log('Detailed error info:', error.toString());
    console.log('Error code:', error.code);
    console.log('HTTP status:', error.status);
    console.log('Context:', error.context);
    console.log('Suggestions:', error.suggestions);
    console.log('Raw response:', error.response);
  }
}
```

## Best Practices

### 1. **Always Check Error Types**
```typescript
if (error instanceof ApiRequestError) {
  // Handle API errors
} else if (error instanceof BufferError) {
  // Handle buffer errors
} else if (error instanceof WebhookProcessingError) {
  // Handle webhook errors
}
```

### 2. **Use Error Codes for Logic**
```typescript
switch (error.code) {
  case WhatsAppErrorCode.RATE_LIMIT_EXCEEDED:
    await delay(5000); // Wait before retry
    break;
  case WhatsAppErrorCode.INVALID_PHONE_NUMBER:
    return { error: 'Please provide a valid phone number' };
}
```

### 3. **Log Structured Data**
```typescript
const errorData = {
  type: error.constructor.name,
  code: error.code,
  message: error.message,
  context: error.context,
  suggestions: error.suggestions
};
logger.error('WhatsApp operation failed', errorData);
```

### 4. **Implement Error Recovery**
```typescript
async function sendWithRetry(phoneNumber: string, message: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.sendText(phoneNumber, message);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        if (error.code === WhatsAppErrorCode.RATE_LIMIT_EXCEEDED) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        if (error.code === WhatsAppErrorCode.INVALID_PHONE_NUMBER) {
          throw error; // Don't retry invalid phone numbers
        }
      }

      if (attempt === maxRetries) throw error;
    }
  }
}
```

## Troubleshooting Common Issues

### Issue: Buffer Overflow
**Error Code**: `7001`
**Solution**:
```typescript
// Reduce buffer size or implement backpressure
const webhookProcessor = client.createWebhookProcessor({
  enableBuffer: true,
  bufferTimeMs: 2000,     // Reduce from 10000ms
  maxBatchSize: 10,       // Reduce from 50
  // ... handlers
});
```

### Issue: Rate Limiting
**Error Code**: `5001`
**Solution**:
```typescript
// Implement exponential backoff
async function sendWithBackoff(phoneNumber: string, message: string) {
  let delay = 1000;
  const maxDelay = 30000;

  while (delay <= maxDelay) {
    try {
      return await client.sendText(phoneNumber, message);
    } catch (error) {
      if (error instanceof ApiRequestError &&
          error.code === WhatsAppErrorCode.RATE_LIMIT_EXCEEDED) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
}
```

### Issue: Invalid Access Token
**Error Code**: `1001`
**Solution**:
```typescript
// Check token validity
try {
  await client.sendText('+1234567890', 'Test');
} catch (error) {
  if (error instanceof ApiRequestError &&
      error.code === WhatsAppErrorCode.MISSING_ACCESS_TOKEN) {
    console.log('Token expired. Please regenerate from Meta Business Manager.');
    // Redirect to token renewal flow
  }
}
```

## Version Information

Enhanced error handling is available in SDK version 1.4.1 and later. All error classes are backward compatible with existing error handling patterns.