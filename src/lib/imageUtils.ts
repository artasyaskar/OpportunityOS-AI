export async function compressImage(file: File, maxSizeMB: number = 2, maxWidthOrHeight: number = 1920): Promise<File> {
  // If not an image, just return the file
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // If already small enough, return
  if (file.size / 1024 / 1024 < maxSizeMB) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidthOrHeight) {
            height = Math.round((height * maxWidthOrHeight) / width);
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width = Math.round((width * maxWidthOrHeight) / height);
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const newFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(newFile);
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          },
          file.type,
          0.8 // 80% quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

export function validateReceiptUpload(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, WEBP, and PDF are allowed.' };
  }

  // 15MB max initial size before compression
  if (file.size > 15 * 1024 * 1024) {
    return { valid: false, error: 'File is too large. Maximum size is 15MB.' };
  }

  // Basic "magic bytes" / executable block
  if (file.name.endsWith('.exe') || file.name.endsWith('.html') || file.name.endsWith('.js') || file.name.endsWith('.sh')) {
    return { valid: false, error: 'Executable or script files are not allowed.' };
  }

  return { valid: true };
}
