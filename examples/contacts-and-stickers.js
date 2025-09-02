const { WhatsAppClient } = require("whatsapp-client-sdk");

const client = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
});

async function sendContactsAndStickers() {
  try {
    const recipientPhone = "+1234567890";

    // 1. Send contact information
    console.log("Sending contact...");
    await client.sendContacts(recipientPhone, [
      {
        name: {
          formatted_name: "María García",
          first_name: "María",
          last_name: "García",
        },
        phones: [
          {
            phone: "+573001234567",
            wa_id: "573001234567",
            type: "WORK",
          },
          {
            phone: "+573007654321",
            type: "HOME",
          },
        ],
        emails: [
          {
            email: "maria.garcia@empresa.com",
            type: "WORK",
          },
        ],
        addresses: [
          {
            street: "Carrera 10 #20-30",
            city: "Bogotá",
            state: "Cundinamarca",
            country: "Colombia",
            country_code: "CO",
            type: "WORK",
          },
        ],
        org: {
          company: "Tech Solutions SAS",
          department: "Desarrollo",
          title: "Senior Developer",
        },
        urls: [
          {
            url: "https://linkedin.com/in/mariagarcia",
            type: "WORK",
          },
        ],
        birthday: "1990-05-15",
      },
    ]);
    console.log("Contact sent successfully!");

    // 2. Send sticker by URL
    console.log("Sending sticker...");
    await client.sendSticker(recipientPhone, {
      link: "https://example.com/stickers/celebration.webp",
    });
    console.log("Sticker sent successfully!");

    // 3. Send multiple contacts
    console.log("Sending multiple contacts...");
    await client.sendContacts(recipientPhone, [
      {
        name: {
          formatted_name: "Juan Pérez",
          first_name: "Juan",
          last_name: "Pérez",
        },
        phones: [
          {
            phone: "+573001111111",
            type: "WORK",
          },
        ],
        emails: [
          {
            email: "juan@empresa.com",
            type: "WORK",
          },
        ],
      },
      {
        name: {
          formatted_name: "Ana López",
          first_name: "Ana",
          last_name: "López",
        },
        phones: [
          {
            phone: "+573002222222",
            type: "HOME",
          },
        ],
        org: {
          company: "Design Studio",
          title: "UX Designer",
        },
      },
    ]);
    console.log("Multiple contacts sent successfully!");

    console.log("All messages sent successfully! ✅");
  } catch (error) {
    console.error("Error sending messages:", error);

    // Handle specific error types
    if (error.name === "WhatsAppApiError") {
      console.error("WhatsApp API Error:", {
        message: error.message,
        code: error.code,
        details: error.details,
      });
    } else if (error.name === "MessageValidationError") {
      console.error("Validation Error:", {
        message: error.message,
        field: error.field,
      });
    }
  }
}

// Run the example
sendContactsAndStickers();