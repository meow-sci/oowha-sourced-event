import { describe, expect, it } from 'vitest';
import { decodeBytes, encodeBytes } from './events';

describe('event byte payloads', () => {
  it('round-trips chunk bytes through the JSON-safe event encoding', () => {
    const bytes = Uint8Array.from([0, 1, 42, 127, 128, 255]);
    expect(decodeBytes(encodeBytes(bytes))).toEqual(bytes);
  });
});
