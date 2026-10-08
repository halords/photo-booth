/* Output: iOS share sheet first, download fallback. */
const Share = (() => {
  'use strict';

  function canvasToFile(canvas, filename) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Could not encode the strip.'));
        resolve(new File([blob], filename, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.92);
    });
  }

  async function share(canvas, filename) {
    const file = await canvasToFile(canvas, filename);
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Photo booth strip' });
      return 'shared';
    }
    downloadFile(file, filename);
    return 'downloaded';
  }

  function downloadFile(file, filename) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function download(canvas, filename) {
    const file = await canvasToFile(canvas, filename);
    downloadFile(file, filename);
  }

  return { share, download };
})();
