// Фото → JPEG data-URL. 1024px — чтобы на весь экран (лайтбокс) фото было резким.
// ~100-200 КБ в base64 — приемлемо для Postgres.
export function fileToPhotoDataUrl(file, maxSize = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('bad image'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('read error'));
    reader.readAsDataURL(file);
  });
}
