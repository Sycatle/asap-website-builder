import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, createLogger, configureLogger, loggers } from '@/lib/logger';

describe('Logger Utility', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
    
    // Reset logger config
    configureLogger({ enabled: true, minLevel: 'debug', timestamps: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Default Logger', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message');
      expect(consoleSpy.debug).toHaveBeenCalledWith('[DEBUG] Debug message');
    });

    it('should log info messages', () => {
      logger.info('Info message');
      expect(consoleSpy.info).toHaveBeenCalledWith('[INFO] Info message');
    });

    it('should log warn messages', () => {
      logger.warn('Warning message');
      expect(consoleSpy.warn).toHaveBeenCalledWith('[WARN] Warning message');
    });

    it('should log error messages', () => {
      logger.error('Error message');
      expect(consoleSpy.error).toHaveBeenCalledWith('[ERROR] Error message');
    });

    it('should pass additional arguments', () => {
      const data = { key: 'value' };
      logger.info('Message with data', data);
      expect(consoleSpy.info).toHaveBeenCalledWith('[INFO] Message with data', data);
    });
  });

  describe('Namespaced Logger', () => {
    it('should create a logger with namespace', () => {
      const apiLogger = createLogger('API');
      apiLogger.info('Request completed');
      expect(consoleSpy.info).toHaveBeenCalledWith('[INFO] [API] Request completed');
    });

    it('should have pre-configured loggers', () => {
      expect(loggers.api).toBeDefined();
      expect(loggers.auth).toBeDefined();
      expect(loggers.ws).toBeDefined();
      expect(loggers.extensions).toBeDefined();
      expect(loggers.files).toBeDefined();
    });

    it('should use pre-configured loggers correctly', () => {
      loggers.api.error('API Error');
      expect(consoleSpy.error).toHaveBeenCalledWith('[ERROR] [API] API Error');
    });
  });

  describe('Logger Configuration', () => {
    it('should respect minLevel setting', () => {
      configureLogger({ minLevel: 'warn' });
      
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warning');
      logger.error('Error');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should disable logging when enabled is false', () => {
      configureLogger({ enabled: false });
      
      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warning');
      logger.error('Error');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('should add timestamps when configured', () => {
      configureLogger({ timestamps: true });
      
      logger.info('With timestamp');
      
      // Check that the call includes a timestamp pattern
      const call = consoleSpy.info.mock.calls[0][0] as string;
      expect(call).toMatch(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/);
    });
  });
});
