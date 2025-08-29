# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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