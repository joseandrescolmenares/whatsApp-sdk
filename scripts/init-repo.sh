#!/bin/bash

echo "🚀 Initializing WhatsApp SDK repository..."

# Initialize git repository
git init

# Add all files
git add .

# Initial commit
git commit -m "Initial commit: WhatsApp SDK v1.0.0

- Complete TypeScript SDK for WhatsApp Business API
- Support for all message types (text, media, interactive, templates)
- Webhook handling and verification
- Media upload/download functionality
- Comprehensive error handling
- Full TypeScript support
- Documentation and examples included"

# Add GitHub remote (you'll need to replace with your actual repo URL)
echo "📝 To add your GitHub repository as remote, run:"
echo "git remote add origin https://github.com/joseandrespena/whatsapp-sdk.git"
echo "git branch -M main"
echo "git push -u origin main"

echo ""
echo "✅ Repository initialized successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Create repository on GitHub: https://github.com/new"
echo "2. Add the remote origin (command shown above)"
echo "3. Push to GitHub"
echo "4. Set up NPM account and get publish token"
echo "5. Add NPM_TOKEN to GitHub Secrets for automatic publishing"

echo ""
echo "🛠️  Development commands:"
echo "npm install    # Install dependencies"
echo "npm run build  # Build the SDK"
echo "npm test       # Run tests"
echo "npm run lint   # Run linter"