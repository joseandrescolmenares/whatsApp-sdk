import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  HttpStatus,
  Logger,
  Injectable,
  Module,
  UseGuards,
  UseInterceptors,
  ExecutionContext,
  CanActivate,
  NestInterceptor,
  CallHandler,
} from "@nestjs/common";
import { Response } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

import { WhatsAppClient } from "whatsapp-client-sdk";

// =============================================================================
// SERVICE - WhatsApp business logic management
// =============================================================================

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly client: any;
  private readonly webhookProcessor: any;

  constructor() {
    this.client = new WhatsAppClient({
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_TOKEN,
    });

    this.webhookProcessor = this.client.createWebhookProcessor({
      onTextMessage: this.handleTextMessage.bind(this),
      onImageMessage: this.handleImageMessage.bind(this),
      onDocumentMessage: this.handleDocumentMessage.bind(this),
      onButtonClick: this.handleButtonClick.bind(this),
      onListSelect: this.handleListSelect.bind(this),
      onLocationMessage: this.handleLocationMessage.bind(this),
      onStickerMessage: this.handleStickerMessage.bind(this),
      onContactMessage: this.handleContactMessage.bind(this),
      onUnknownMessage: this.handleUnknownMessage.bind(this),
      onError: this.handleError.bind(this),
    });

    this.logger.log("🚀 WhatsApp Service initialized with Nest.js");
  }

  // Text message handler
  private async handleTextMessage(message: any) {
    this.logger.log(
      `📝 [Nest.js] Texto recibido de ${message.from}: ${message.text}`
    );

    const text = message.text.toLowerCase();

    if (text.includes("nest")) {
      await this.client.sendText(
        message.from,
        "🦅 Greetings from Nest.js! A scalable and modular framework for Node.js."
      );
    } else if (text.includes("architecture")) {
      await this.client.sendButtons(
        message.from,
        "Learn about Nest.js architecture:",
        [
          { id: "nest_modules", title: "📦 Modules" },
          { id: "nest_controllers", title: "🎮 Controllers" },
          { id: "nest_services", title: "⚙️ Services" },
          { id: "nest_guards", title: "🛡️ Guards" },
        ],
        {
          header: { type: "text", text: "Nest.js Architecture" },
          footer: "Learn more at wazap.dev",
        }
      );
    } else if (text.includes("help")) {
      await this.client.sendList(
        message.from,
        "Available commands in this Nest.js bot:",
        "View Commands",
        [
          {
            title: "Information",
            rows: [
              {
                id: "cmd_nest",
                title: "🦅 Nest Info",
                description: "Information about Nest.js",
              },
              {
                id: "cmd_arch",
                title: "🏗️ Architecture",
                description: "Framework architecture",
              },
              {
                id: "cmd_features",
                title: "✨ Features",
                description: "Main features",
              },
            ],
          },
          {
            title: "Examples",
            rows: [
              {
                id: "cmd_api",
                title: "🔌 REST API",
                description: "Create REST APIs",
              },
              {
                id: "cmd_graphql",
                title: "📊 GraphQL",
                description: "APIs with GraphQL",
              },
              {
                id: "cmd_microservices",
                title: "🚀 Microservices",
                description: "Microservices architecture",
              },
            ],
          },
        ]
      );
    } else {
      // Smart echo
      await this.client.sendText(
        message.from,
        `🔄 [Nest.js Service] Processed: "${message.text}"\n\nType "help" to see available commands.`
      );
    }
  }

  // Image message handler
  private async handleImageMessage(message: any) {
    this.logger.log(`🖼️ [Nest.js] Image received: ${message.media.id}`);

    const caption = message.media.caption || "Sin descripción";

    await this.client.sendText(
      message.from,
      `📸 Image processed by Nest.js!\n\n` +
        `📄 Caption: "${caption}"\n` +
        `🆔 Media ID: ${message.media.id}\n` +
        `🎯 Processed with dependency injection!`
    );
  }

  // Document handler
  private async handleDocumentMessage(message: any) {
    this.logger.log(`📄 [Nest.js] Document: ${message.media.filename}`);

    await this.client.sendText(
      message.from,
      `📋 Document "${message.media.filename}" received.\n\n` +
        `✅ Processed by Nest.js service\n` +
        `🔒 Enterprise security applied\n` +
        `📊 Analytics logged`
    );
  }

  // Button click handler
  private async handleButtonClick(message: any) {
    const buttonId = message.interactive.button_id;
    this.logger.log(`🔘 [Nest.js] Button: ${buttonId}`);

    switch (buttonId) {
      case "nest_modules":
        await this.client.sendText(
          message.from,
          "📦 **Nest.js Modules**\n\n" +
            "🏗️ Organize the application\n" +
            "📋 Encapsulate providers\n" +
            "🔗 Import/export system\n" +
            "🌐 Global modules available\n" +
            "⚡ Lazy loading support"
        );
        break;

      case "nest_controllers":
        await this.client.sendText(
          message.from,
          "🎮 **Nest.js Controllers**\n\n" +
            "🛣️ Handle HTTP routes\n" +
            "🎯 Decorators like @Get, @Post\n" +
            "📨 Request/Response handling\n" +
            "🛡️ Integration with guards\n" +
            "🔍 Validation pipes"
        );
        break;

      case "nest_services":
        await this.client.sendText(
          message.from,
          "⚙️ **Nest.js Services**\n\n" +
            "💉 Dependency injection\n" +
            "🏪 Business logic layer\n" +
            "🔄 Reusable components\n" +
            "🧪 Easy to test\n" +
            "📊 Provider pattern"
        );
        break;

      case "nest_guards":
        await this.client.sendText(
          message.from,
          "🛡️ **Nest.js Guards**\n\n" +
            "🔐 Authorization logic\n" +
            "👮 CanActivate interface\n" +
            "🎯 Route-level protection\n" +
            "🔑 JWT integration\n" +
            "🚪 Global/controller/method scope"
        );
        break;
    }
  }

  // List selection handler
  private async handleListSelect(message: any) {
    const listId = message.interactive.list_id;
    this.logger.log(`📋 [Nest.js] Lista: ${listId}`);

    const responses = {
      cmd_nest:
        "🦅 Nest.js is a framework for building scalable Node.js applications, using TypeScript by default.",
      cmd_arch:
        "🏗️ Nest.js uses decorators, dependency injection, modules, controllers, services, and guards for clean architecture.",
      cmd_features:
        "✨ Features: TypeScript, Decorators, DI, Testing, CLI, GraphQL, Microservices, WebSockets, and more.",
      cmd_api:
        "🔌 Creating REST APIs is simple with @Controller, @Get, @Post, @Put, @Delete decorators.",
      cmd_graphql:
        "📊 GraphQL integrated with @nestjs/graphql using code-first or schema-first approach.",
      cmd_microservices:
        "🚀 Full support for microservices with transporters like TCP, Redis, NATS, RabbitMQ.",
    };

    const response =
      responses[listId] || `Command ${listId} selected from Nest.js!`;
    await this.client.sendText(message.from, response);
  }

  // Location handler
  private async handleLocationMessage(message: any) {
    const { latitude, longitude, name } = message.location;
    this.logger.log(
      `📍 [Nest.js] Ubicación: ${name} (${latitude}, ${longitude})`
    );

    await this.client.sendText(
      message.from,
      `📍 **Ubicación procesada por Nest.js**\n\n` +
        `📌 ${name || "Ubicación compartida"}\n` +
        `🌐 Coordenadas: ${latitude}, ${longitude}\n\n` +
        `✅ Processed by enterprise-grade service\n` +
        `📊 Location data logged and analyzed`
    );
  }

  // Sticker handler
  private async handleStickerMessage(message: any) {
    this.logger.log(`😀 [Nest.js] Sticker de ${message.from}`);

    await this.client.sendText(
      message.from,
      "😊 ¡Sticker recibido en Nest.js!\n\n" +
        "🎨 Los stickers hacen la conversación más divertida\n" +
        "⚡ Procesado con dependency injection"
    );
  }

  // Contact handler
  private async handleContactMessage(message: any) {
    this.logger.log(`👥 [Nest.js] Contacto recibido`);

    await this.client.sendText(
      message.from,
      "📇 ¡Contacto recibido!\n\n" +
        "✅ Información guardada en nuestro sistema\n" +
        "🔒 Datos protegidos con Nest.js security\n" +
        "📧 Te contactaremos pronto"
    );
  }

  // Unknown message handler
  private async handleUnknownMessage(message: any) {
    this.logger.warn(`❓ [Nest.js] Mensaje desconocido: ${message.type}`);

    await this.client.sendText(
      message.from,
      "🤔 Mensaje recibido pero formato no reconocido.\n\n" +
        "🦅 Nuestro sistema Nest.js lo está procesando\n" +
        "👨‍💼 Un agente te contactará si es necesario"
    );
  }

  // Error handler
  private async handleError(error: Error, message?: any) {
    this.logger.error(`❌ [Nest.js] Error: ${error.message}`, error.stack);

    if (message) {
      try {
        await this.client.sendText(
          message.from,
          "⚠️ Error temporal en el sistema.\n\n" +
            "🛡️ Nest.js está manejando el problema\n" +
            "🔄 Por favor intenta nuevamente"
        );
      } catch (sendError) {
        this.logger.error("❌ Error enviando mensaje de error:", sendError);
      }
    }
  }

  // Public method to process webhooks
  async processWebhook(body: any, query?: any) {
    return await this.webhookProcessor.processWebhook(body, query);
  }

  // Health check method
  async healthCheck() {
    try {
      const isConnected = await this.client.testConnection();
      return {
        status: "ok",
        whatsapp: isConnected ? "connected" : "disconnected",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("❌ Health check failed:", error);
      return {
        status: "error",
        whatsapp: "disconnected",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// =============================================================================
// GUARD - Seguridad y validación
// =============================================================================

@Injectable()
export class WhatsAppWebhookGuard implements CanActivate {
  private readonly logger = new Logger(WhatsAppWebhookGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userAgent = request.headers["user-agent"] || "";

    // Validación básica del User-Agent de WhatsApp
    if (request.method === "POST" && !userAgent.includes("WhatsApp")) {
      this.logger.warn(
        `⚠️ Suspicious request without WhatsApp user-agent from ${request.ip}`
      );
      // En producción, podrías rechazar estas requests
      // return false;
    }

    this.logger.log(
      `✅ Request authorized: ${request.method} from ${request.ip}`
    );
    return true;
  }
}

// =============================================================================
// INTERCEPTOR - Logging y métricas
// =============================================================================

@Injectable()
export class WhatsAppLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(WhatsAppLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const startTime = Date.now();

    this.logger.log(`📥 Incoming ${method} ${url}`);

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          this.logger.log(`📤 Completed ${method} ${url} in ${duration}ms`);

          if (data && data.messages) {
            this.logger.log(`📨 Processed ${data.messages.length} messages`);
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `❌ Failed ${method} ${url} in ${duration}ms: ${error.message}`
          );
        },
      })
    );
  }
}

// =============================================================================
// CONTROLLER - Endpoints HTTP
// =============================================================================

@Controller("webhook")
@UseGuards(WhatsAppWebhookGuard)
@UseInterceptors(WhatsAppLoggingInterceptor)
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get()
  async verifyWebhook(@Query() query: any, @Res() res: Response) {
    try {
      this.logger.log("🔍 Webhook verification request");

      const result = await this.whatsappService.processWebhook({}, query);

      res.status(result.status).send(result.response.toString());
    } catch (error) {
      this.logger.error("❌ Webhook verification error:", error);
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send("Internal Server Error");
    }
  }

  @Post()
  async handleWebhook(@Body() body: any, @Res() res: Response) {
    try {
      this.logger.log("📨 Processing webhook messages");

      const result = await this.whatsappService.processWebhook(body);

      // Log successful processing
      if (result.messages && result.messages.length > 0) {
        this.logger.log(
          `✅ Successfully processed ${result.messages.length} messages`
        );
      }

      res.status(result.status).send(result.response);
    } catch (error) {
      this.logger.error("❌ Webhook processing error:", error);
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send("Internal Server Error");
    }
  }
}

// =============================================================================
// HEALTH CHECK CONTROLLER
// =============================================================================

@Controller("health")
export class HealthController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get()
  async checkHealth() {
    return await this.whatsappService.healthCheck();
  }
}

// =============================================================================
// MODULE - Configuración de Nest.js
// =============================================================================

@Module({
  controllers: [WhatsAppController, HealthController],
  providers: [
    WhatsAppService,
    WhatsAppWebhookGuard,
    WhatsAppLoggingInterceptor,
  ],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}

// =============================================================================
// APP MODULE - Módulo principal
// =============================================================================

@Module({
  imports: [WhatsAppModule],
})
export class AppModule {}

// =============================================================================
// MAIN - Bootstrap de la aplicación
// =============================================================================

import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // CORS configuration
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    methods: ["GET", "POST"],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix("api");

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Nest.js WhatsApp Webhook Server running on port ${port}`);
  console.log(`📡 Webhook endpoint: http://localhost:${port}/api/webhook`);
  console.log(`💚 Health check: http://localhost:${port}/api/health`);
}

// Solo ejecutar si es el archivo principal
if (require.main === module) {
  bootstrap();
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  WhatsAppService,
  WhatsAppController,
  HealthController,
  WhatsAppModule,
  AppModule,
  WhatsAppWebhookGuard,
  WhatsAppLoggingInterceptor,
  bootstrap,
};

// =============================================================================
// CONFIGURATION FILES
// =============================================================================

/*
📋 SETUP INSTRUCTIONS:

1. PACKAGE.JSON DEPENDENCIES:
   npm install @nestjs/core @nestjs/common @nestjs/platform-express
   npm install reflect-metadata rxjs
   npm install --save-dev @nestjs/cli

2. ENVIRONMENT VARIABLES (.env):
   WHATSAPP_ACCESS_TOKEN=your_token_here
   WHATSAPP_PHONE_NUMBER_ID=your_phone_id_here
   WHATSAPP_WEBHOOK_TOKEN=your_verify_token_here
   PORT=3000
   ALLOWED_ORIGINS=http://localhost:3000

3. TSCONFIG.JSON:
   {
     "compilerOptions": {
       "module": "commonjs",
       "declaration": true,
       "removeComments": true,
       "emitDecoratorMetadata": true,
       "experimentalDecorators": true,
       "allowSyntheticDefaultImports": true,
       "target": "es2017",
       "sourceMap": true,
       "outDir": "./dist",
       "baseUrl": "./",
       "incremental": true,
       "skipLibCheck": true,
       "strictNullChecks": false,
       "noImplicitAny": false,
       "strictBindCallApply": false,
       "forceConsistentCasingInFileNames": false,
       "noFallthroughCasesInSwitch": false
     }
   }

4. MAIN.TS (Alternative):
   import { bootstrap } from './nestjs-webhook';
   bootstrap();

5. PACKAGE.JSON SCRIPTS:
   "start": "nest start",
   "start:dev": "nest start --watch",
   "build": "nest build",
   "test": "jest"

✅ NEST.JS BENEFITS:
- Enterprise-grade architecture
- Dependency injection built-in
- Decorators for clean code
- Guards for security
- Interceptors for cross-cutting concerns
- Excellent TypeScript support
- Built-in testing utilities
- Scalable modular structure
- GraphQL and microservices ready
- Full documentation at https://wazap.dev

🚀 DEPLOYMENT:
- Docker: Create Dockerfile with Node.js
- Heroku: Set buildpack to Node.js
- AWS: Use Elastic Beanstalk or Lambda
- GCP: Use Cloud Run or App Engine
- PM2: For production process management
*/
