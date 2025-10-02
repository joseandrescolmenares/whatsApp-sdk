import { WhatsAppClient } from "../client/WhatsAppClient";
import {
  OutgoingMessage,
  BroadcastRecipient,
  BroadcastOptions,
  BroadcastProgress,
  MessageSendResult,
  BroadcastResult,
} from "../types";
import { formatPhoneNumber } from "../utils";


const RATE_LIMITS = {
  messagesPerSecond: 80,
  messagesPerMinute: 1000,
  defaultBatchSize: 50,
  minDelayBetweenMessages: 13, 
  concurrentMessagesLimit: 10, 
  maxRetries: 3, 
};

export class BroadcastManager {
  private client: WhatsAppClient;
  private isProcessing = false;
  private aborted = false;

  constructor(client: WhatsAppClient) {
    this.client = client;
  }

  async sendBroadcast(
    phoneNumbers: string[],
    message: OutgoingMessage,
    options: BroadcastOptions = {}
  ): Promise<BroadcastResult> {
    const {
      batchSize = RATE_LIMITS.defaultBatchSize,
      delayBetweenBatches = this.calculateBatchDelay(batchSize),
      onProgress,
      onMessageSent,
      stopOnError = false,
    } = options;

    if (!phoneNumbers || phoneNumbers.length === 0) {
      throw new Error("Phone numbers array cannot be empty");
    }

    if (!message) {
      throw new Error("Message is required");
    }

    const broadcastId = this.generateBroadcastId();
    const startTime = Date.now();
    const results: MessageSendResult[] = [];
    let successful = 0;
    let failed = 0;

    this.isProcessing = true;
    this.aborted = false;

    const formattedPhones = phoneNumbers.map((phone) =>
      formatPhoneNumber(phone)
    );

    const batches = this.createBatches(formattedPhones, batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      if (this.aborted) {
        break;
      }

      const batch = batches[batchIndex];
      const batchStartTime = Date.now();

      
      const concurrentLimit = RATE_LIMITS.concurrentMessagesLimit;

      for (let i = 0; i < batch.length; i += concurrentLimit) {
        if (this.aborted) {
          break;
        }

        const chunk = batch.slice(i, i + concurrentLimit);
        const chunkStartTime = Date.now();

        const chunkPromises = chunk.map(async (phoneNumber) => {
          if (this.aborted) {
            return null;
          }

          try {
            const recipientMessage = {
              ...message,
              to: phoneNumber,
            };

            const response = await this.client.sendMessage(recipientMessage);

            const result: MessageSendResult = {
              phoneNumber,
              success: true,
              messageId: response.messageId,
              timestamp: Date.now(),
            };

            successful++;
            results.push(result);

            if (onMessageSent) {
              onMessageSent(result);
            }

            return result;
          } catch (error) {
            const result: MessageSendResult = {
              phoneNumber,
              success: false,
              error: error instanceof Error ? error.message : String(error),
              timestamp: Date.now(),
            };

            failed++;
            results.push(result);

            if (onMessageSent) {
              onMessageSent(result);
            }

            if (stopOnError) {
              this.aborted = true;
            }

            return result;
          }
        });

        await Promise.all(chunkPromises);

        
        await this.applyThrottling(
          chunkStartTime,
          chunk.length,
          i + concurrentLimit < batch.length
        );
      }

      this.reportProgress(
        onProgress,
        formattedPhones.length,
        successful,
        failed,
        startTime
      );

      await this.applyBatchDelay(
        batchStartTime,
        delayBetweenBatches,
        batchIndex < batches.length - 1 && !this.aborted
      );
    }

    this.isProcessing = false;
    const endTime = Date.now();

    return {
      broadcastId,
      total: formattedPhones.length,
      successful,
      failed,
      results,
      duration: endTime - startTime,
      startTime,
      endTime,
    };
  }


  async sendBulkTemplates(
    recipients: BroadcastRecipient[],
    templateName: string,
    languageCode: string,
    options: BroadcastOptions = {}
  ): Promise<BroadcastResult> {
    if (!recipients || recipients.length === 0) {
      throw new Error("Recipients array cannot be empty");
    }

    const {
      batchSize = RATE_LIMITS.defaultBatchSize,
      delayBetweenBatches = this.calculateBatchDelay(batchSize),
      onProgress,
      onMessageSent,
      stopOnError = false,
    } = options;

    const broadcastId = this.generateBroadcastId();
    const startTime = Date.now();
    const results: MessageSendResult[] = [];
    let successful = 0;
    let failed = 0;

    this.isProcessing = true;
    this.aborted = false;

    const batches = this.createBatches(recipients, batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      if (this.aborted) {
        break;
      }

      const batch = batches[batchIndex];
      const batchStartTime = Date.now();

      
      const concurrentLimit = RATE_LIMITS.concurrentMessagesLimit;

      for (let i = 0; i < batch.length; i += concurrentLimit) {
        if (this.aborted) {
          break;
        }

        const chunk = batch.slice(i, i + concurrentLimit);
        const chunkStartTime = Date.now();

        const chunkPromises = chunk.map(async (recipient) => {
          if (this.aborted) {
            return null;
          }

          try {
            const components = recipient.variables
              ? this.buildTemplateComponents(recipient.variables)
              : undefined;

            const response = await this.client.sendTemplate(
              recipient.phoneNumber,
              templateName,
              languageCode,
              components
            );

            const result: MessageSendResult = {
              phoneNumber: recipient.phoneNumber,
              success: true,
              messageId: response.messageId,
              timestamp: Date.now(),
            };

            successful++;
            results.push(result);

            if (onMessageSent) {
              onMessageSent(result);
            }

            return result;
          } catch (error) {
            const result: MessageSendResult = {
              phoneNumber: recipient.phoneNumber,
              success: false,
              error: error instanceof Error ? error.message : String(error),
              timestamp: Date.now(),
            };

            failed++;
            results.push(result);

            if (onMessageSent) {
              onMessageSent(result);
            }

            if (stopOnError) {
              this.aborted = true;
            }

            return result;
          }
        });

        await Promise.all(chunkPromises);

        
        await this.applyThrottling(
          chunkStartTime,
          chunk.length,
          i + concurrentLimit < batch.length
        );
      }

      
      this.reportProgress(
        onProgress,
        recipients.length,
        successful,
        failed,
        startTime
      );


      await this.applyBatchDelay(
        batchStartTime,
        delayBetweenBatches,
        batchIndex < batches.length - 1 && !this.aborted
      );
    }

    this.isProcessing = false;
    const endTime = Date.now();

    return {
      broadcastId,
      total: recipients.length,
      successful,
      failed,
      results,
      duration: endTime - startTime,
      startTime,
      endTime,
    };
  }

  abort(): void {
    this.aborted = true;
  }

  isRunning(): boolean {
    return this.isProcessing;
  }

  // ========================
  // PRIVATE HELPER METHODS
  // ========================

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private calculateBatchDelay(batchSize: number): number {
    const messagesPerMinute = 900;
    const delayPerBatch = (60000 / messagesPerMinute) * batchSize;
    return Math.ceil(delayPerBatch);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateBroadcastId(): string {
    return `broadcast_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private buildTemplateComponents(variables: Record<string, string>): any[] {
    const parameters = Object.values(variables).map((value) => ({
      type: "text",
      text: value,
    }));

    return [
      {
        type: "body",
        parameters,
      },
    ];
  }


  private reportProgress(
    onProgress: ((progress: BroadcastProgress) => void) | undefined,
    total: number,
    successful: number,
    failed: number,
    startTime: number
  ): void {
    if (!onProgress) return;

    const sent = successful + failed;
    const pending = total - sent;
    const percentage = (sent / total) * 100;
    const elapsed = Date.now() - startTime;
    const avgTimePerMessage = sent > 0 ? elapsed / sent : 0;
    const estimatedTimeRemaining = avgTimePerMessage * pending;

    const progress: BroadcastProgress = {
      total,
      sent,
      failed,
      pending,
      percentage,
      startTime,
      currentTime: Date.now(),
      estimatedTimeRemaining,
    };

    onProgress(progress);
  }


  private async applyThrottling(
    chunkStartTime: number,
    chunkLength: number,
    hasMoreChunks: boolean
  ): Promise<void> {
    const chunkDuration = Date.now() - chunkStartTime;
    const minChunkDuration = chunkLength * RATE_LIMITS.minDelayBetweenMessages;
    const remainingDelay = minChunkDuration - chunkDuration;

    if (remainingDelay > 0 && hasMoreChunks) {
      await this.sleep(remainingDelay);
    }
  }


  private async applyBatchDelay(
    batchStartTime: number,
    delayBetweenBatches: number,
    hasMoreBatches: boolean
  ): Promise<void> {
    if (!hasMoreBatches) return;

    const batchDuration = Date.now() - batchStartTime;
    const remainingDelay = Math.max(0, delayBetweenBatches - batchDuration);

    if (remainingDelay > 0) {
      await this.sleep(remainingDelay);
    }
  }
}
