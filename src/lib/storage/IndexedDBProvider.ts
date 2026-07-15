import { StorageProvider } from './StorageProvider';

const DB_NAME = 'OpportunityOS_Storage';
const STORE_NAME = 'files';
const META_STORE_NAME = 'metadata';

export class IndexedDBProvider implements StorageProvider {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
        if (!db.objectStoreNames.contains(META_STORE_NAME)) {
          db.createObjectStore(META_STORE_NAME);
        }
      };
    });

    return this.dbPromise;
  }

  async upload(key: string, file: File | Blob, onProgress?: (pct: number) => void): Promise<string> {
    const db = await this.getDB();
    
    // Simulate network delay and progress for demo purposes
    if (onProgress) {
      for (let i = 0; i <= 100; i += 20) {
        onProgress(i);
        await new Promise(r => setTimeout(r, 100)); // 100ms * 5 = 500ms upload simulation
      }
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, META_STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const metaStore = tx.objectStore(META_STORE_NAME);

      store.put(file, key);
      
      const meta = {
        name: (file as File).name || 'uploaded_file',
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString()
      };
      metaStore.put(meta, key);

      tx.oncomplete = () => resolve(key);
      tx.onerror = () => reject(tx.error);
    });
  }

  async download(key: string): Promise<Blob> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => {
        if (request.result) resolve(request.result);
        else reject(new Error('File not found in IndexedDB'));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async generateDownloadUrl(key: string): Promise<string> {
    const blob = await this.download(key);
    return URL.createObjectURL(blob);
  }

  async delete(key: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, META_STORE_NAME], 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.objectStore(META_STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async exists(key: string): Promise<boolean> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).getKey(key);
      request.onsuccess = () => resolve(request.result !== undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async replace(key: string, file: File | Blob, onProgress?: (pct: number) => void): Promise<string> {
    return this.upload(key, file, onProgress); // put overwrites if key exists
  }

  async getMetadata(key: string): Promise<Record<string, any>> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE_NAME, 'readonly');
      const request = tx.objectStore(META_STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || {});
      request.onerror = () => reject(request.error);
    });
  }

  async list(prefix?: string): Promise<string[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).getAllKeys();
      request.onsuccess = () => {
        let keys = (request.result as string[]) || [];
        if (prefix) {
          keys = keys.filter(k => k.startsWith(prefix));
        }
        resolve(keys);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async copy(sourceKey: string, destKey: string): Promise<string> {
    const blob = await this.download(sourceKey);
    return this.upload(destKey, blob);
  }

  async move(sourceKey: string, destKey: string): Promise<string> {
    await this.copy(sourceKey, destKey);
    await this.delete(sourceKey);
    return destKey;
  }
}
