/* Pro Camera — in-app viewfinder via getUserMedia.
 * This is what makes countdown auto-fire possible: frames are grabbed
 * programmatically, so no iOS tap-gesture is needed per shot.
 * Falls back gracefully where getUserMedia is unavailable (installed iOS PWAs). */
const ProCamera = (() => {
  'use strict';

  let stream = null;
  let videoEl = null;

  function supported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  async function start(facingMode, videoElement) {
    stop();
    videoEl = videoElement;
    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: facingMode }, // 'user' | 'environment'
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    };
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoEl.srcObject = stream;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.classList.toggle('mirrored', facingMode === 'user');
    await videoEl.play();
  }

  function stop() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    if (videoEl) {
      videoEl.srcObject = null;
      videoEl = null;
    }
  }

  /* Grab the current frame as a square canvas (center crop). */
  function capture(mirrored) {
    if (!videoEl || !videoEl.videoWidth) throw new Error('Camera not ready.');
    const vw = videoEl.videoWidth, vh = videoEl.videoHeight;
    const s = Math.min(vw, vh);
    const sx = (vw - s) / 2, sy = (vh - s) / 2;
    const cv = document.createElement('canvas');
    cv.width = s; cv.height = s;
    const ctx = cv.getContext('2d');
    if (mirrored) {
      ctx.translate(s, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(videoEl, sx, sy, s, s, 0, 0, s, s);
    return cv;
  }

  function canvasToFile(canvas, name) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Could not encode frame.'));
        resolve(new File([blob], name, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.95);
    });
  }

  return { supported, start, stop, capture, canvasToFile };
})();
