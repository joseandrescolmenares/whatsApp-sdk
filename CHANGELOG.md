# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.5.0] - 2024-12-20

### Added
- **Enhanced Error Handling System**: Comprehensive error management with detailed context and suggestions
  - New error classes: `EnhancedWhatsAppError`, `ApiRequestError`, `WebhookProcessingError`, `BufferError`
  - Categorized error codes (1000-7099) for better error identification
  - Detailed error context including timestamps, operation details, and debugging information
  - Automatic suggestions for error resolution based on error type and context
  - Structured error data for better monitoring and logging

### Enhanced
- **WhatsAppClient**: Improved HTTP interceptor with specific error mapping
  - Maps Meta API error codes to descriptive messages
  - Provides context-aware suggestions for each error type
  - Enhanced debugging information for API failures
- **WebhookProcessor**: Better error handling in message processing
  - Buffer overflow detection and prevention
  - Contextual error information for webhook failures
  - Improved error reporting for handler execution failures

### Documentation
- Added comprehensive `ENHANCED_ERROR_HANDLING_GUIDE.md` with examples and best practices
- Detailed error code reference and troubleshooting guide
- Migration examples from basic to enhanced error handling

## [1.4.1] - 2024-12-20

### Enhanced
- **Buffer Configuration**: Simplified buffer configuration in `createWebhookProcessor`
  - Now accepts buffer options (`enableBuffer`, `bufferTimeMs`, `maxBatchSize`) directly alongside handlers
  - No need to wrap handlers in a separate configuration object
  - Added `WebhookHandlersWithBuffer` interface for better TypeScript support
  - Maintains full backward compatibility with existing code

### Documentation
- Added comprehensive `BUFFER_CONFIGURATION_GUIDE.md` with usage examples and migration guide

## [1.4.0] - 2024-12-20

### Added
- **Message Buffer System**: Optional buffering system to group messages from the same phone number
  - Configurable buffer time (`bufferTimeMs`) and batch size (`maxBatchSize`)
  - Automatic grouping of messages for better context and performance
  - Backwards compatible - existing code works without changes
  - Enable with `enableBuffer: true`
- **Complete Sticker Support**: Full detection and handling of WhatsApp stickers
  - `onStickerMessage` handler for processing sticker messages
  - Access to sticker metadata (`message.media.id`, `message.media.mime_type`)
  - Support for both individual and batched sticker processing

### Enhanced
- **WebhookProcessor**: Now supports both individual and array message processing
- **Type Safety**: Improved TypeScript types for buffer and sticker functionality
- **Documentation**: Comprehensive guide for message buffering in `MESSAGE_BUFFER.md`

### Fixed
- **Sticker Parsing**: Fixed parsing of sticker messages in both `WhatsAppClient` and `WebhookProcessor`
- **Message Media**: Enhanced media detection to include stickers in webhook processing

## [1.0.0] - 2024-12-XX

### Added
- Initial release of WhatsApp SDK
- WhatsAppClient with full message sending capabilities
- Support for text messages with URL preview
- Support for media messages (image, video, audio, document)
- Interactive message support (buttons, lists)
- Template message support
- Location message support
- Media upload and download functionality
- Webhook verification and parsing
- Comprehensive error handling with custom error types
- Input validation for phone numbers and messages
- TypeScript support with complete type definitions
- Retry mechanism with exponential backoff
- Rate limit handling
- Connection testing functionality

### Features
- **Text Messages**: Send simple text messages with optional URL preview
- **Media Messages**: Send images, videos, audio files, and documents
- **Interactive Messages**: Create buttons and list menus for user interaction
- **Template Messages**: Send approved template messages with parameters
- **Location Messages**: Send location with coordinates and optional metadata
- **Media Management**: Upload media to WhatsApp servers and download received media
- **Webhook Support**: Verify webhooks and parse incoming messages
- **Error Handling**: Comprehensive error types for different failure scenarios
- **Validation**: Built-in validation for phone numbers, messages, and configuration
- **TypeScript**: Full TypeScript support with detailed type definitions

### Documentation
- Comprehensive README with installation and usage instructions
- API reference documentation
- Code examples for all features
- Webhook handling example with Express.js
- Contributing guidelines
- MIT License

### Development
- TypeScript configuration optimized for library development
- Rollup build system for CommonJS and ESM output
- Jest testing framework with coverage reporting
- ESLint and Prettier for code quality
- GitHub Actions workflow for CI/CD (planned)

---

## How to read this changelog

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** in case of vulnerabilities