import {
  formatPhoneNumber,
  generateMessageId,
  getFileExtension,
  withRetry,
  chunk,
  safeJsonParse,
  isValidUrl,
  truncateText,
  escapeWhatsAppText,
  delay
} from '../src/utils/helpers';

describe('Helper Functions', () => {
  describe('formatPhoneNumber', () => {
    it('should format phone numbers correctly', () => {
      expect(formatPhoneNumber('1234567890')).toBe('+1234567890');
      expect(formatPhoneNumber('+1234567890')).toBe('+1234567890');
      expect(formatPhoneNumber('1-234-567-890')).toBe('+1234567890');
      expect(formatPhoneNumber('(123) 456-7890')).toBe('+1234567890');
    });
  });

  describe('generateMessageId', () => {
    it('should generate unique message IDs', () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();
      
      expect(id1).toMatch(/^msg_[a-z0-9]+_[a-z0-9]+$/);
      expect(id2).toMatch(/^msg_[a-z0-9]+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('getFileExtension', () => {
    it('should return correct file extensions', () => {
      expect(getFileExtension('image/jpeg')).toBe('jpg');
      expect(getFileExtension('image/png')).toBe('png');
      expect(getFileExtension('audio/mpeg')).toBe('mp3');
      expect(getFileExtension('video/mp4')).toBe('mp4');
      expect(getFileExtension('application/pdf')).toBe('pdf');
      expect(getFileExtension('unknown/type')).toBe('bin');
    });
  });

  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await withRetry(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValueOnce('success');
      
      const result = await withRetry(mockFn, { maxRetries: 3 });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('persistent failure'));
      
      await expect(withRetry(mockFn, { maxRetries: 2 }))
        .rejects.toThrow('persistent failure');
      
      expect(mockFn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });
  });

  describe('chunk', () => {
    it('should split arrays into chunks', () => {
      const array = [1, 2, 3, 4, 5, 6, 7];
      
      expect(chunk(array, 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
      expect(chunk(array, 5)).toEqual([[1, 2, 3, 4, 5], [6, 7]]);
      expect(chunk([], 3)).toEqual([]);
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const result = safeJsonParse('{"key": "value"}', {});
      expect(result).toEqual({ key: 'value' });
    });

    it('should return fallback for invalid JSON', () => {
      const fallback = { default: true };
      const result = safeJsonParse('invalid json', fallback);
      expect(result).toBe(fallback);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('ftp://example.com')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      expect(truncateText('Hello World!', 8)).toBe('Hello...');
      expect(truncateText('Short', 10)).toBe('Short');
    });
  });

  describe('escapeWhatsAppText', () => {
    it('should escape special characters', () => {
      const text = 'Hello\nWorld\t"quoted"\r\\backslash';
      const escaped = escapeWhatsAppText(text);
      
      expect(escaped).toBe('Hello\\nWorld\\t\\"quoted\\"\\r\\\\backslash');
    });
  });

  describe('delay', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await delay(50);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(45); // Allow some tolerance
    });
  });
});