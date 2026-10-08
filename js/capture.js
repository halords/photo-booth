/* Native-camera capture via file input.
 *
 * On iPhone this opens the actual Camera app (capture="user" → front,
 * capture="environment" → rear). The shutter tap is a direct user gesture,
 * which is what iOS requires to open the picker reliably.
 */
const Capture = (() => {
  'use strict';

  function input() {
    return document.getElementById('camera-input');
  }

  /* Opens the native camera. Resolves with the File, rejects on cancel. */
  function takePhoto(camera) {
    return new Promise((resolve, reject) => {
      const el = input();
      if (camera) el.setAttribute('capture', camera);
      else el.removeAttribute('capture');
      el.value = '';

      let settled = false;
      const done = (fn, arg) => {
        if (settled) return;
        settled = true;
        el.removeEventListener('change', onChange);
        window.removeEventListener('focus', onFocus);
        fn(arg);
      };
      const onChange = () => {
        if (el.files && el.files[0]) done(resolve, el.files[0]);
        else done(reject, new Error('No file chosen.'));
      };
      // iOS fires focus when returning from the camera without a shot.
      // Give the change event a beat to win the race first.
      const onFocus = () => {
        setTimeout(() => {
          if (!el.files || !el.files.length) done(reject, new Error('cancelled'));
        }, 700);
      };
      el.addEventListener('change', onChange);
      window.addEventListener('focus', onFocus);
      el.click();

      // Safety net: never hang forever.
      setTimeout(() => done(reject, new Error('Timed out waiting for the camera.')), 120000);
    });
  }

  return { takePhoto };
})();
