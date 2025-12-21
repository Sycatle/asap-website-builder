/**
 * Centralized Logger
 * 
 * A simple but extensible logger that:
 * - Only logs in development by default
 * - Provides consistent formatting
 * - Can be easily extended for production logging (e.g., Sentry, LogRocket)
 * - Supports namespaced loggers for different modules
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  /** Enable logging (defaults to true in development) */
  enabled: boolean;
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Include timestamps in logs */
  timestamps: boolean;
  /** Custom handler for production error reporting */
  errorReporter?: (error: Error, context?: Record<string, unknown>) => void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isDev = import.meta.env.DEV;

const defaultConfig: LoggerConfig = {
  enabled: isDev,
  minLevel: isDev ? 'debug' : 'warn',
  timestamps: true,
};

let globalConfig: LoggerConfig = { ...defaultConfig };

/**
 * Configure the global logger settings
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Format a log message with optional namespace and timestamp
 */
function formatMessage(namespace: string | null, level: LogLevel, message: string): string {
  const parts: string[] = [];
  
  if (globalConfig.timestamps) {
    parts.push(`[${new Date().toISOString().slice(11, 23)}]`);
  }
  
  parts.push(`[${level.toUpperCase()}]`);
  
  if (namespace) {
    parts.push(`[${namespace}]`);
  }
  
  parts.push(message);
  
  return parts.join(' ');
}

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  if (!globalConfig.enabled) return false;
  return LOG_LEVELS[level] >= LOG_LEVELS[globalConfig.minLevel];
}

/**
 * Get the appropriate console method for a log level
 */
function getConsoleMethod(level: LogLevel): (...args: unknown[]) => void {
  switch (level) {
    case 'debug':
      return console.debug.bind(console);
    case 'info':
      return console.info.bind(console);
    case 'warn':
      return console.warn.bind(console);
    case 'error':
      return console.error.bind(console);
  }
}

/**
 * Core logging function
 */
function log(
  namespace: string | null,
  level: LogLevel,
  message: string,
  ...args: unknown[]
): void {
  if (!shouldLog(level)) return;
  
  const formattedMessage = formatMessage(namespace, level, message);
  const consoleMethod = getConsoleMethod(level);
  
  if (args.length > 0) {
    consoleMethod(formattedMessage, ...args);
  } else {
    consoleMethod(formattedMessage);
  }
  
  // Report errors to external service in production
  if (level === 'error' && globalConfig.errorReporter) {
    const error = args.find(arg => arg instanceof Error) as Error | undefined;
    if (error) {
      globalConfig.errorReporter(error, {
        namespace,
        message,
        additionalArgs: args.filter(arg => !(arg instanceof Error)),
      });
    }
  }
}

/**
 * Create a namespaced logger instance
 */
export function createLogger(namespace: string) {
  return {
    debug: (message: string, ...args: unknown[]) => log(namespace, 'debug', message, ...args),
    info: (message: string, ...args: unknown[]) => log(namespace, 'info', message, ...args),
    warn: (message: string, ...args: unknown[]) => log(namespace, 'warn', message, ...args),
    error: (message: string, ...args: unknown[]) => log(namespace, 'error', message, ...args),
  };
}

/**
 * Default logger (no namespace)
 */
export const logger = {
  debug: (message: string, ...args: unknown[]) => log(null, 'debug', message, ...args),
  info: (message: string, ...args: unknown[]) => log(null, 'info', message, ...args),
  warn: (message: string, ...args: unknown[]) => log(null, 'warn', message, ...args),
  error: (message: string, ...args: unknown[]) => log(null, 'error', message, ...args),
};

// Pre-configured loggers for common use cases
export const loggers = {
  api: createLogger('API'),
  auth: createLogger('Auth'),
  ws: createLogger('WebSocket'),
  extensions: createLogger('Extensions'),
  files: createLogger('Files'),
  onboarding: createLogger('Onboarding'),
  presence: createLogger('Presence'),
  ui: createLogger('UI'),
};

export default logger;
