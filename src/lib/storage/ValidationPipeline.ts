import { StorageConfig } from './StorageConfig';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ValidationPipeline {
  static async validate(file: File): Promise<void> {
    // 1. Size Check
    if (file.size > StorageConfig.maxSizeBytes) {
      throw new ValidationError(`File size exceeds the ${(StorageConfig.maxSizeBytes / (1024 * 1024)).toFixed(0)}MB limit.`);
    }

    // 2. Mime Type Check
    if (!StorageConfig.allowedMimeTypes.includes(file.type)) {
      // Sometimes file.type is empty on certain OS/browsers, fallback to extension check
      if (file.type !== '') {
        throw new ValidationError(`File type ${file.type} is not allowed.`);
      }
    }

    // 3. Extension Check
    const name = file.name.toLowerCase();
    const hasValidExt = StorageConfig.allowedExtensions.some(ext => name.endsWith(ext));
    if (!hasValidExt) {
      throw new ValidationError(`File extension is not allowed. Supported formats: ${StorageConfig.allowedExtensions.join(', ')}`);
    }

    // 4. Future: Virus Scan, Duplicate Check, etc.
  }
}
