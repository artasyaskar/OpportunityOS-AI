export const StorageConfig = {
  maxSizeBytes: 2 * 1024 * 1024, // 2 MB strict limit for Hackathon
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
};
