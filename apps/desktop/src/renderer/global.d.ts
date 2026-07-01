import type { BridgeApi } from '@litelizard/shared';

declare global {
  interface Window {
    litelizard: BridgeApi;
  }
}

export {};
