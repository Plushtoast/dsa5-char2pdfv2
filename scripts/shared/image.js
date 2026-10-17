export class ImageConverter {
  static async toDataUrl(src, outputFormat = 'image/png') {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL(outputFormat));
      };
      img.onerror = reject;
      img.src = src;
      if (img.complete) {
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
        img.src = src;
      }
    });
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
