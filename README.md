# Booth — a pocket photo booth (PWA)

iPhone-first PWA photo booth. The **native iOS Camera app** does the shooting
(via `capture` file input — the only camera path that works reliably inside an
installed iPhone PWA); this app handles the booth: multi-shot sessions,
editorial strip layouts, filters, captions, and sharing. No account, no cloud —
photos never leave the device.

## Run it

No build step. Serve the folder over HTTPS (or `localhost`):

```bash
cd photo-booth
python3 -m http.server 8080
```

On iPhone: open the URL in Safari → Share → **Add to Home Screen**. Launch
from the home-screen icon for the fullscreen standalone experience.

> Camera access requires a secure context (HTTPS or localhost). `file://`
> will not work.

## Flow

1. **Home** — new session, gallery of finished strips (IndexedDB, on-device).
2. **Setup** — event name, layout (Strip ×4 / ×3, Grid 2×2, Single), front/rear
   camera, filter (Natural / Noir / Sepia / Warm), optional caption.
3. **Capture** — big shutter button opens the native camera per shot; thumbnails
   with per-shot retake. iOS requires the camera to open from a direct tap, so
   there is deliberately no auto-fire countdown — the shutter tap *is* the beat.
4. **Compose** — live canvas preview of the strip; switch filters and edit the
   caption, re-renders instantly.
5. **Done** — Share opens the iOS share sheet (Save to Photos, AirDrop,
   Messages…); Download as fallback.

## Design

Follows the anti-AI-slop spec (`~/workspace/design/anti-ai-slop.md`): bone
paper, charcoal ink, one vermilion accent, Fraunces serif + Inter, thin rules,
numbered sections. The strips themselves are composed on canvas in the same
language — hairline frame, tracked small caps, serif event name, date stamp.

## Technical notes

- Orientation: photos are decoded with `createImageBitmap(..., { imageOrientation: 'from-image' })`
  so iPhone EXIF rotation is respected (fallback: plain `<img>`).
- Filters are manual pixel ops (`noir`/`sepia`/`warm`) — `ctx.filter` is
  unreliable on iOS Safari, so it's avoided.
- Strips render at 640px wide, exported as JPEG q0.92.
- Cancelling the native camera returns you to the capture view; nothing is lost.
- Gallery persists in IndexedDB; event name persists in localStorage.
