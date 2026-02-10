/**
 * ASYNC LOGGING QUEUE SERVICE
 * Handles asynchronous, non-blocking logging with retry logic
 * Ensures logging never blocks user actions or API responses
 */

class LoggingQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxQueueSize = 10000;
    this.maxRetries = 3;
    this.batchSize = 100;
    this.flushInterval = 1000; // 1 second
    this.retryDelay = 5000; // 5 seconds
    
    // Start auto-flush
    this.startAutoFlush();
  }
  
  /**
   * Add log entry to queue (non-blocking)
   */
  enqueue(logType, logData) {
    try {
      // Check queue size
      if (this.queue.length >= this.maxQueueSize) {
        console.warn('[LoggingQueue] Queue full, dropping oldest logs');
        this.queue.shift();
      }
      
      this.queue.push({
        type: logType,
        data: logData,
        retries: 0,
        timestamp: new Date()
      });
      
      // Trigger immediate flush if queue is large
      if (this.queue.length >= this.batchSize && !this.processing) {
        setImmediate(() => this.flush());
      }
    } catch (error) {
      // Never throw errors from logging
      console.error('[LoggingQueue] Failed to enqueue log:', error.message);
    }
  }
  
  /**
   * Start auto-flush timer
   */
  startAutoFlush() {
    this.flushTimer = setInterval(() => {
      if (this.queue.length > 0 && !this.processing) {
        this.flush();
      }
    }, this.flushInterval);
  }
  
  /**
   * Flush logs to database (async)
   */
  async flush() {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    try {
      // Get batch of logs
      const batch = this.queue.splice(0, this.batchSize);
      
      // Group by type
      const grouped = {};
      for (const log of batch) {
        if (!grouped[log.type]) {
          grouped[log.type] = [];
        }
        grouped[log.type].push(log);
      }
      
      // Process each type
      const promises = Object.entries(grouped).map(([type, logs]) => 
        this.processBatch(type, logs)
      );
      
      await Promise.allSettled(promises);
      
    } catch (error) {
      console.error('[LoggingQueue] Flush error:', error.message);
    } finally {
      this.processing = false;
    }
  }
  
  /**
   * Process a batch of logs
   */
  async processBatch(type, logs) {
    try {
      const ActivityLog = require('../../models/observability/ActivityLog');
      const ApiLog = require('../../models/observability/ApiLog');
      const SystemMetric = require('../../models/observability/SystemMetric');
      const HealthCheck = require('../../models/observability/HealthCheck');
      const CrashLog = require('../../models/observability/CrashLog');
      
      const models = {
        activity: ActivityLog,
        api: ApiLog,
        metric: SystemMetric,
        health: HealthCheck,
        crash: CrashLog
      };
      
      const Model = models[type];
      if (!Model) {
        console.warn(`[LoggingQueue] Unknown log type: ${type}`);
        return;
      }
      
      // Bulk insert
      const documents = logs.map(log => log.data);
      await Model.insertMany(documents, { ordered: false });
      
    } catch (error) {
      // Retry failed logs
      console.error(`[LoggingQueue] Failed to insert ${type} logs:`, error.message);
      
      logs.forEach(log => {
        if (log.retries < this.maxRetries) {
          log.retries++;
          this.queue.push(log);
        } else {
          console.error(`[LoggingQueue] Dropped log after ${this.maxRetries} retries:`, log.type);
        }
      });
    }
  }
  
  /**
   * Get queue stats
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      maxQueueSize: this.maxQueueSize,
      processing: this.processing
    };
  }
  
  /**
   * Shutdown gracefully
   */
  async shutdown() {
    clearInterval(this.flushTimer);
    await this.flush();
  }
}

// Singleton instance
const loggingQueue = new LoggingQueue();

module.exports = loggingQueue;
