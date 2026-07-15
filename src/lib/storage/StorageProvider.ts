export interface StorageProvider {
  /**
   * Uploads a file to storage
   * @param key The unique storage key (path) for the file
   * @param file The file or blob to upload
   * @param onProgress Callback to report upload percentage (0-100)
   * @returns The resolved storage key
   */
  upload(key: string, file: File | Blob, onProgress?: (pct: number) => void): Promise<string>;
  
  /**
   * Downloads a file as a Blob
   */
  download(key: string): Promise<Blob>;
  
  /**
   * Generates a short-lived download URL (for cloud providers) or a Blob URL (for local providers)
   */
  generateDownloadUrl(key: string): Promise<string>;
  
  /**
   * Deletes a file from storage
   */
  delete(key: string): Promise<void>;
  
  /**
   * Checks if a file exists
   */
  exists(key: string): Promise<boolean>;
  
  /**
   * Replaces an existing file
   */
  replace(key: string, file: File | Blob, onProgress?: (pct: number) => void): Promise<string>;
  
  /**
   * Retrieves metadata (size, content type, custom tags)
   */
  getMetadata(key: string): Promise<Record<string, any>>;
  
  /**
   * Lists files under a specific prefix
   */
  list(prefix?: string): Promise<string[]>;
  
  /**
   * Copies a file to a new location
   */
  copy(sourceKey: string, destKey: string): Promise<string>;
  
  /**
   * Moves (renames) a file
   */
  move(sourceKey: string, destKey: string): Promise<string>;
}
