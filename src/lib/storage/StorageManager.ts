import { StorageProvider } from './StorageProvider';
import { IndexedDBProvider } from './IndexedDBProvider';
import { FirebaseStorageProvider } from './FirebaseStorageProvider';

class StorageManager {
  private static instance: StorageProvider;

  static getProvider(): StorageProvider {
    if (!StorageManager.instance) {
      const useMockStorage = process.env.NEXT_PUBLIC_USE_MOCK_STORAGE === 'true';
      
      if (useMockStorage || process.env.NODE_ENV === 'test') {
        StorageManager.instance = new IndexedDBProvider();
      } else {
        StorageManager.instance = new FirebaseStorageProvider();
      }
    }
    return StorageManager.instance;
  }
}

// Export a singleton instance getter
export const storageProvider = StorageManager.getProvider();
