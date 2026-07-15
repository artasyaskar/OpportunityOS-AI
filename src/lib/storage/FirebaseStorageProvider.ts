import { StorageProvider } from './StorageProvider';
import { storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, getBlob, getMetadata, listAll } from 'firebase/storage';

export class FirebaseStorageProvider implements StorageProvider {
  async upload(key: string, file: File | Blob, onProgress?: (pct: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, key);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (onProgress) {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          }
        },
        (error) => reject(error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  }

  async download(key: string): Promise<Blob> {
    const storageRef = ref(storage, key);
    if (typeof window === 'undefined') {
      const url = await getDownloadURL(storageRef);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
      return await res.blob();
    }
    return await getBlob(storageRef);
  }

  async generateDownloadUrl(key: string): Promise<string> {
    const storageRef = ref(storage, key);
    return await getDownloadURL(storageRef);
  }

  async delete(key: string): Promise<void> {
    const storageRef = ref(storage, key);
    await deleteObject(storageRef);
  }

  async exists(key: string): Promise<boolean> {
    try {
      const storageRef = ref(storage, key);
      await getMetadata(storageRef);
      return true;
    } catch (e: any) {
      if (e.code === 'storage/object-not-found') return false;
      throw e;
    }
  }

  async replace(key: string, file: File | Blob, onProgress?: (pct: number) => void): Promise<string> {
    return this.upload(key, file, onProgress);
  }

  async getMetadata(key: string): Promise<Record<string, any>> {
    const storageRef = ref(storage, key);
    return await getMetadata(storageRef);
  }

  async list(prefix?: string): Promise<string[]> {
    const listRef = prefix ? ref(storage, prefix) : ref(storage);
    const res = await listAll(listRef);
    return res.items.map(itemRef => itemRef.fullPath);
  }

  async copy(sourceKey: string, destKey: string): Promise<string> {
    const blob = await this.download(sourceKey);
    return this.upload(destKey, blob);
  }

  async move(sourceKey: string, destKey: string): Promise<string> {
    const url = await this.copy(sourceKey, destKey);
    await this.delete(sourceKey);
    return url;
  }
}
