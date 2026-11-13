const dataUrlCache = new Map();
const DATA_URL_CACHE_LIMIT = 32;

/** Drop a canvas bitmap immediately. Detached canvases otherwise stay in GPU memory until a late GC. */
export function releaseCanvas(canvas) {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
}

function rememberDataUrl(key, url) {
  if (dataUrlCache.size >= DATA_URL_CACHE_LIMIT) {
    dataUrlCache.delete(dataUrlCache.keys().next().value);
  }
  dataUrlCache.set(key, url);
}

function encodeImage(src, outputFormat) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    let settled = false;
    const finish = () => {
      img.onload = null;
      img.onerror = null;
      img.removeAttribute('src');
    };
    img.onload = () => {
      if (settled) return;
      settled = true;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      try {
        ctx.drawImage(img, 0, 0);
        const url = canvas.toDataURL(outputFormat);
        releaseCanvas(canvas);
        finish();
        resolve(url);
      } catch (error) {
        releaseCanvas(canvas);
        finish();
        reject(error);
      }
    };
    img.onerror = (error) => {
      if (settled) return;
      settled = true;
      finish();
      reject(error);
    };
    img.src = src;
    if (img.complete) {
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
      img.src = src;
    }
  });
}

export class ImageConverter {
  static async toDataUrl(src, outputFormat = 'image/png') {
    if (!src || String(src).startsWith('data:')) return src;
    const key = `${outputFormat}\0${src}`;
    const cached = dataUrlCache.get(key);
    if (cached) return cached;

    const url = await encodeImage(src, outputFormat);
    rememberDataUrl(key, url);
    return url;
  }

  static async getActorPicture(src) {
    try {
      return await this.toDataUrl(src);
    } catch (error) {
      console.error('ERROR getting actor picture:', error);
      throw error;
    }
  }
}
