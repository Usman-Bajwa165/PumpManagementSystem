import { Injectable, LoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CustomLogger implements LoggerService {
  private logsDir: string;

  constructor() {
    // Use project root for logs directory
    this.logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
      console.log(`📁 Logs directory created at: ${this.logsDir}`);
    }
  }

  private getLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logsDir, `app-${date}.log`);
  }

  private writeLog(level: string, message: string, context?: string, trace?: string, userId?: string) {
    const timestamp = new Date().toISOString();
    const userInfo = userId ? ` [User: ${userId}]` : '';
    const contextInfo = context ? ` [${context}]` : '';
    const logMessage = `[${timestamp}] [${level}]${contextInfo}${userInfo} ${message}${trace ? `\n${trace}` : ''}\n`;

    fs.appendFileSync(this.getLogFileName(), logMessage);
    
    // Also log to console
    const consoleMessage = `[${level}]${contextInfo}${userInfo} ${message}`;
    switch (level) {
      case 'ERROR':
        console.error(consoleMessage, trace || '');
        break;
      case 'WARN':
        console.warn(consoleMessage);
        break;
      default:
        console.log(consoleMessage);
    }
  }

  log(message: string, context?: string, userId?: string) {
    this.writeLog('INFO', message, context, undefined, userId);
  }

  error(message: string, trace?: string, context?: string, userId?: string) {
    this.writeLog('ERROR', message, context, trace, userId);
  }

  warn(message: string, context?: string, userId?: string) {
    this.writeLog('WARN', message, context, undefined, userId);
  }

  debug(message: string, context?: string, userId?: string) {
    this.writeLog('DEBUG', message, context, undefined, userId);
  }

  verbose(message: string, context?: string, userId?: string) {
    this.writeLog('VERBOSE', message, context, undefined, userId);
  }

  // Custom methods for specific scenarios
  logAuth(action: string, username: string, success: boolean, reason?: string) {
    const message = `Auth ${action}: ${username} - ${success ? 'SUCCESS' : 'FAILED'}${reason ? ` (${reason})` : ''}`;
    this.writeLog(success ? 'INFO' : 'WARN', message, 'AuthService');
  }

  logApiRequest(method: string, url: string, userId?: string, statusCode?: number) {
    const message = `${method} ${url} - Status: ${statusCode || 'pending'}`;
    this.writeLog('INFO', message, 'API', undefined, userId);
  }

  logDatabaseOperation(operation: string, table: string, success: boolean, error?: string) {
    const message = `DB ${operation} on ${table} - ${success ? 'SUCCESS' : 'FAILED'}${error ? `: ${error}` : ''}`;
    this.writeLog(success ? 'INFO' : 'ERROR', message, 'Database', error);
  }

  logBusinessOperation(operation: string, details: string, userId?: string, success: boolean = true, error?: string) {
    const message = `${operation}: ${details} - ${success ? 'SUCCESS' : 'FAILED'}${error ? `: ${error}` : ''}`;
    this.writeLog(success ? 'INFO' : 'ERROR', message, 'Business', error, userId);
  }
}
