import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/utils/formatters';

describe('Utils', () => {
  describe('cn (classnames)', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'active', false && 'hidden')).toBe('base active');
    });

    it('should handle undefined values', () => {
      expect(cn('base', undefined, 'end')).toBe('base end');
    });

    it('should merge tailwind classes correctly', () => {
      expect(cn('px-4 py-2', 'px-6')).toBe('py-2 px-6');
    });

    it('should handle arrays', () => {
      expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
    });

    it('should handle objects', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });
  });
});

describe('Formatters', () => {
  describe('formatBytes', () => {
    it('should format zero bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1048576)).toBe('1 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should handle decimal places', () => {
      expect(formatBytes(1536, 1)).toBe('1.5 KB');
      expect(formatBytes(1536, 0)).toBe('2 KB');
    });

    it('should handle undefined', () => {
      expect(formatBytes(undefined)).toBe('0 Bytes');
    });

    it('should handle null', () => {
      expect(formatBytes(null)).toBe('0 Bytes');
    });

    it('should handle NaN', () => {
      expect(formatBytes(NaN)).toBe('0 Bytes');
    });

    it('should handle negative values', () => {
      expect(formatBytes(-100)).toBe('0 Bytes');
    });
  });
});
