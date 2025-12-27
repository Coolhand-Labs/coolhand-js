import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Bundle tests', () => {
  describe('coolhand.min.js', () => {
    let CoolhandJS: typeof import('../src/index').default;

    beforeAll(() => {
      const bundlePath = path.resolve(__dirname, '../dist/coolhand.min.js');

      if (!fs.existsSync(bundlePath)) {
        throw new Error('Minified bundle not found. Run `npm run build` first.');
      }

      const bundleCode = fs.readFileSync(bundlePath, 'utf-8');

      // Create a mock window/document environment for the UMD bundle
      const context = {
        window: globalThis,
        document: globalThis.document,
        self: globalThis,
        global: globalThis,
        CoolhandJS: undefined as unknown,
      };

      // Execute the bundle in the context
      const script = new vm.Script(bundleCode);
      script.runInNewContext(context);

      CoolhandJS = context.CoolhandJS as typeof import('../src/index').default;
    });

    it('should export CoolhandJS global', () => {
      expect(CoolhandJS).toBeDefined();
    });

    it('should have init method', () => {
      expect(typeof CoolhandJS.init).toBe('function');
    });

    it('should have attach method', () => {
      expect(typeof CoolhandJS.attach).toBe('function');
    });

    it('should have detach method', () => {
      expect(typeof CoolhandJS.detach).toBe('function');
    });

    it('should initialize with API key', () => {
      const result = CoolhandJS.init('test-api-key', { autoAttach: false });
      expect(result).toBe(true);
    });

    it('should return false without API key', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Create a fresh instance to test
      const freshCoolhand = new (CoolhandJS as unknown as { constructor: new () => typeof CoolhandJS }).constructor();
      const result = (freshCoolhand as typeof CoolhandJS).init('');

      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('coolhand.js (unminified)', () => {
    it('should exist and be larger than minified version', () => {
      const minPath = path.resolve(__dirname, '../dist/coolhand.min.js');
      const devPath = path.resolve(__dirname, '../dist/coolhand.js');

      if (!fs.existsSync(minPath) || !fs.existsSync(devPath)) {
        throw new Error('Bundles not found. Run `npm run build` first.');
      }

      const minSize = fs.statSync(minPath).size;
      const devSize = fs.statSync(devPath).size;

      expect(devSize).toBeGreaterThan(minSize);
    });

    it('should have source maps', () => {
      const minMapPath = path.resolve(__dirname, '../dist/coolhand.min.js.map');
      const devMapPath = path.resolve(__dirname, '../dist/coolhand.js.map');

      expect(fs.existsSync(minMapPath)).toBe(true);
      expect(fs.existsSync(devMapPath)).toBe(true);
    });
  });

  describe('Type definitions', () => {
    it('should have index.d.ts', () => {
      const dtsPath = path.resolve(__dirname, '../dist/index.d.ts');
      expect(fs.existsSync(dtsPath)).toBe(true);
    });

    it('should have types.d.ts', () => {
      const dtsPath = path.resolve(__dirname, '../dist/types.d.ts');
      expect(fs.existsSync(dtsPath)).toBe(true);
    });
  });
});
