/**
 * Client-side Image Compression Utility for Bills and Attachments
 * Resizes high-resolution mobile camera photos (12-48MP, 5-15MB) down to optimized full HD (1600-1920px, 150-350KB)
 * Keeps receipt text, numbers, and barcodes crystal clear while speeding up upload and loading by 90-95%.
 */

export async function compressImageFile(
  file: File,
  maxDimension = 1920,
  quality = 0.82
): Promise<File> {
  // If not an image (e.g. PDF or non-image), return as-is
  if (!file || !file.type || !file.type.startsWith("image/")) {
    return file;
  }

  // If already very small (under 200KB), return as-is
  if (file.size < 200 * 1024 && !file.type.includes("heic") && !file.type.includes("heif")) {
    return file;
  }

  return new Promise((resolve) => {
    // If running server-side without window/document, return file
    if (typeof window === "undefined" || typeof document === "undefined") {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Calculate scale while maintaining aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      // Fill white background for transparent PNGs converted to JPEG
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          // Create sanitized .jpg filename
          const cleanBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^\w.-]/gi, "_") || "bill_photo";
          const compressedFile = new File([blob], `${cleanBaseName}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

export async function compressImageFiles(
  files: File[],
  maxDimension = 1920,
  quality = 0.82
): Promise<File[]> {
  if (!files || !files.length) return [];
  return Promise.all(files.map((file) => compressImageFile(file, maxDimension, quality)));
}
