import assert from 'node:assert/strict';
import test from 'node:test';
import { isNativeAbiMismatch } from './ensure-native-runtime.mjs';

test('isNativeAbiMismatch detects Node native module ABI errors', () => {
  assert.equal(
    isNativeAbiMismatch(
      'The module was compiled against a different Node.js version using NODE_MODULE_VERSION 127.',
    ),
    true,
  );
});

test('isNativeAbiMismatch ignores unrelated native module errors', () => {
  assert.equal(isNativeAbiMismatch('Cannot find module better-sqlite3'), false);
});
