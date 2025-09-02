const express = require("express");
const { WhatsAppClient } = require("whatsapp-client-sdk");

const app = express();
app.use(express.json());

// Initialize WhatsApp client
const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN, // Required for the processor
});

// 🚀 Create webhook processor with handlers
const webhookProcessor = client.createWebhookProcessor({
  // Handler for text messages
  onTextMessage: async (message) => {
    console.log(`📝 Text received from ${message.from}: ${message.text}`);

    // Auto-respond based on content
    if (message.text.toLowerCase().includes("hello")) {
      await client.sendText(message.from, "Hello! How can I help you?");
    } else if (message.text.toLowerCase().includes("price")) {
      await client.sendText(
        message.from,
        "Our prices start from $10. Are you interested in any specific product?"
      );
    } else {
      // Echo the message
      await client.sendText(
        message.from,
        `I received your message: "${message.text}"`
      );
    }
  },

  // Handler for images
  onImageMessage: async (message) => {
    console.log(
      `🖼️ Image received from ${message.from} (ID: ${message.media.id})`
    );

    const caption = message.media.caption || "No caption";
    await client.sendText(
      message.from,
      `Thanks for the image! "${caption}". We'll get back to you soon.`
    );
  },

  // Handler for documents
  onDocumentMessage: async (message) => {
    console.log(`📄 Document received: ${message.media.filename}`);

    await client.sendText(
      message.from,
      `Document "${message.media.filename}" received. We'll review it and contact you.`
    );
  },

  // Handler for interactive buttons
  onButtonClick: async (message) => {
    console.log(`🔘 Button pressed: ${message.interactive.button_id}`);

    switch (message.interactive.button_id) {
      case "catalog":
        await client.sendText(message.from, "📋 Here's our catalog...");
        break;
      case "support":
        await client.sendText(message.from, "💬 Connecting you to support...");
        break;
      case "location":
        await client.sendLocation(message.from, 4.6097, -74.0817, {
          name: "Our Store",
          address: "Bogotá, Colombia",
        });
        break;
      default:
        await client.sendText(
          message.from,
          "Option selected: " + message.interactive.button_id
        );
    }
  },

  // Handler for lists
  onListSelect: async (message) => {
    console.log(`📋 List selected: ${message.interactive.list_id}`);

    await client.sendText(
      message.from,
      `You selected: ${message.interactive.list_id}. Processing...`
    );
  },

  // Handler for locations
  onLocationMessage: async (message) => {
    const { latitude, longitude, name } = message.location;
    console.log(
      `📍 Location received: ${name || "No name"} (${latitude}, ${longitude})`
    );

    await client.sendText(
      message.from,
      `Location received: ${name || "Location"} 📍. Thanks for sharing!`
    );
  },

  // Handler for stickers
  onStickerMessage: async (message) => {
    console.log(`😀 Sticker received from ${message.from}`);

    // Respond with another sticker (if we have one)
    await client.sendText(message.from, "😊 I love stickers!");
  },

  // Handler for unrecognized messages
  onUnknownMessage: async (message) => {
    console.log(`❓ Unknown message type: ${message.type}`);

    await client.sendText(
      message.from,
      "I received your message, but I can't process it automatically. An agent will contact you soon."
    );
  },

  // Handler for errors
  onError: async (error, message) => {
    console.error("❌ Error processing message:", error.message);

    if (message) {
      try {
        await client.sendText(
          message.from,
          "Sorry, there was an error processing your message. Please try again."
        );
      } catch (sendError) {
        console.error("Error sending error message:", sendError);
      }
    }
  },
});

// 🎯 Single endpoint for GET and POST
app.all("/webhook", async (req, res) => {
  try {
    const result = await webhookProcessor.processWebhook(req.body, req.query);
    res.status(result.status).send(result.response);

    // Log processed messages
    if (result.messages && result.messages.length > 0) {
      console.log(`📨 Processed ${result.messages.length} messages`);
    }
  } catch (error) {
    console.error("Error in webhook endpoint:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
