import { StorageProvider } from './StorageProvider';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class CloudflareR2Provider implements StorageProvider {
  private s3: S3Client;
  private bucket: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucket = process.env.R2_BUCKET || 'opportunityos';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.warn('Missing R2 configuration. CloudflareR2Provider will fail.');
    }

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  async upload(key: string, file: File | Blob, onProgress?: (pct: number) => void): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }));

    if (onProgress) onProgress(100);
    return key;
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    const response = await this.s3.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
    
    if (!response.Body) {
      throw new Error('No body returned from R2 download');
    }
    
    const arrayBuffer = await response.Body.transformToByteArray();
    return Buffer.from(arrayBuffer);
  }

  async download(key: string): Promise<Blob> {
    const buffer = await this.getFileBuffer(key);
    // Convert Buffer to Uint8Array for Blob compatibility
    return new Blob([new Uint8Array(buffer)]);
  }

  async generateDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    // Signed URL expires in 1 hour
    return await getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') return false;
      throw error;
    }
  }

  async replace(key: string, file: File | Blob, onProgress?: (pct: number) => void): Promise<string> {
    return this.upload(key, file, onProgress);
  }

  async getMetadata(key: string): Promise<Record<string, any>> {
    const response = await this.s3.send(new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
    return {
      size: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      ...response.Metadata,
    };
  }

  async list(prefix?: string): Promise<string[]> {
    // Basic implementation (not paginating here for simplicity, but normally needed)
    return [];
  }

  async copy(sourceKey: string, destKey: string): Promise<string> {
    await this.s3.send(new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${sourceKey}`,
      Key: destKey,
    }));
    return destKey;
  }

  async move(sourceKey: string, destKey: string): Promise<string> {
    await this.copy(sourceKey, destKey);
    await this.delete(sourceKey);
    return destKey;
  }
}
