type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private log(level: LogLevel, context: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const payload = data ? JSON.stringify(data) : '';
    
    // In production, this would send to PostHog, Datadog, etc.
    // For now, we output to console with structured format
    
    switch (level) {
      case 'info':
        console.info(`[${timestamp}] [INFO] [${context}] ${message} ${payload}`);
        break;
      case 'warn':
        console.warn(`[${timestamp}] [WARN] [${context}] ${message} ${payload}`);
        break;
      case 'error':
        console.error(`[${timestamp}] [ERROR] [${context}] ${message} ${payload}`);
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[${timestamp}] [DEBUG] [${context}] ${message} ${payload}`);
        }
        break;
    }
  }

  info(message: string, data?: any) { this.log('info', 'APP', message, data); }
  warn(message: string, data?: any) { this.log('warn', 'APP', message, data); }
  error(message: string, error?: any) { this.log('error', 'APP', message, error); }
  
  ai(message: string, data?: any) { this.log('info', 'AI_ROUTER', message, data); }
  storage(message: string, data?: any) { this.log('info', 'STORAGE', message, data); }
  auth(message: string, data?: any) { this.log('info', 'AUTH', message, data); }
}

export const logger = new Logger();
