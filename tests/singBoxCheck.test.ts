import { describe, it, expect } from 'vitest';
import { sampleProfiles, checkProfileConfig } from '../scripts/check-configs';

describe('sing-box check verification for all 6 core profile types', () => {
  for (const item of sampleProfiles) {
    it(`should pass sing-box check for ${item.name}`, () => {
      const res = checkProfileConfig(item.profile);
      if (!res.success) {
        console.error(`Check output for ${item.name}:\n`, res.output);
      }
      expect(res.success).toBe(true);
      expect(res.output).not.toMatch(/FATAL/i);
      expect(res.output).not.toMatch(/ERROR/i);
    });
  }
});
