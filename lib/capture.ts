import type { Lens } from './types';

/**
 * Native-camera capture via file input. On iPhone this opens the actual
 * Camera app (capture="user" → front, capture="environment" → rear).
 * The shutter tap is a direct user gesture, which iOS requires.
 */
export function takePhoto(input: HTMLInputElement, camera: Lens): Promise<File> {
  return new Promise((resolve, reject) => {
    if (camera) input.setAttribute('capture', camera);
    else input.removeAttribute('capture');
    input.value = '';

    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      input.removeEventListener('change', onChange);
      input.removeEventListener('cancel', onCancel);
      window.removeEventListener('focus', onFocus);
      fn();
    };
    const onChange = () => {
      const f = input.files && input.files[0];
      if (f) done(() => resolve(f));
      else done(() => reject(new Error('No file chosen.')));
    };
    const onCancel = () => done(() => reject(new Error('cancelled')));
    // iOS fires focus when returning from the camera without a shot.
    const onFocus = () => {
      setTimeout(() => {
        if (!input.files || !input.files.length)
          done(() => reject(new Error('cancelled')));
      }, 700);
    };
    input.addEventListener('change', onChange);
    input.addEventListener('cancel', onCancel);
    window.addEventListener('focus', onFocus);
    input.click();
    timer = setTimeout(
      () => done(() => reject(new Error('Timed out waiting for the camera.'))),
      120000
    );
  });
}
