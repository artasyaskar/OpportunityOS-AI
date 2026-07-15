export const StorageConfig = {
  maxSizeBytes: 20 * 1024 * 1024, // 20 MB
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
};
