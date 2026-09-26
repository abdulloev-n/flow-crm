import type { AppData, StorageInfo } from './types';
declare global {
  interface Window {
    flow: {
      load: () => Promise<AppData | null>;
      save: (data: AppData) => Promise<void>;
      onSaveStatus: (callback: (status: 'saved' | 'error') => void) => () => void;
      storageInfo: () => Promise<StorageInfo>;
      chooseStorage: () => Promise<{ path: string; hasData: boolean } | null>;
      moveStorage: (path: string, useExisting: boolean) => Promise<void>;
      openStorage: () => Promise<void>;
      exportBackup: () => Promise<string | null>;
      importBackup: () => Promise<boolean>;
      restart: () => Promise<void>;
      notify: (title: string, body: string) => Promise<void>;
      appVersion: () => Promise<string>;
    };
  }
}
export {};
