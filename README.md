# Pocket Photo Booth

A private photo booth for everyday moments and events. Built with Next.js 15, React 19, TypeScript, browser canvas, and IndexedDB.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. Live camera access requires localhost or HTTPS and browser permission. For a production server, use `npm run build` followed by `npm start`. A phone accessing a computer over plain HTTP should use uploads; serve HTTPS for live capture.

## Create a keepsake

Choose a layout and style, take a timed series with a live camera, use the phone camera input, or upload images. Review each photo, reorder, crop, rotate, flip, and replace it. Apply a shared filter, frame color, caption, and date. Save the finished print in the local gallery, download JPG or PNG, share through supported system share sheets, or print.

The gallery includes search, favorites, sorting, and deletion. Settings persist between visits. Camera tracks stop when leaving capture, hiding the page, or ending a session. Sound, screen flash, mirroring, and framing guides are optional.

## Custom 4R event layouts

Select **Photo booth -> Custom 4R** under Layout & camera.

- Portrait is 4 x 6 inches / 1200 x 1800 pixels. Landscape is 6 x 4 inches / 1800 x 1200 pixels. Exports include 300 DPI metadata.
- Add one to six editable photo placeholders. Drag a frame to position it, drag its corner to resize, or use numeric fields for size, position, and rotation. Arrow keys move a focused frame; Shift moves it five percentage points.
- Choose a birthday, celebration, or minimal background, or upload your event artwork. Add the occasion name and message in Personal touches.
- Photos fill placeholders in their numbered order. Overlapping frames layer in that same order. The required number of captures follows the placeholder count.
- Change frame placement, orientation, and background again in review. Use the Photos tab to adjust the photo inside a frame. Add/remove frames during setup so the number of captured photos stays consistent in review.
- Save a layout JSON file and load it during setup to reuse the same event design on another browser or device.
- The last design is retained in browser preferences. Very large background artwork may remain session-only when browser preferences storage is full.
- Printing requests a 4R page size. Select 4R paper and actual size in the printer dialog; borderless printing depends on printer support.

## Privacy, storage, and compatibility

Captured and uploaded photos are processed locally. There is no account or remote photo upload. Finished gallery images are stored in this browser on this device. Download valuable images before clearing browser storage. Original photos are held in memory for the current session; reopening a gallery item provides export and sharing of the finished image, rather than reconstructing the original editing session.

USB cameras are supported when the browser sees them as a video input. Direct DSLR control, green screen processing, PDF export, and video capture are not exposed as implemented features. HEIC input depends on browser decoding; JPG, PNG, and WebP are more broadly supported. Web Share and native camera input vary by device. When file sharing is unavailable, the share action downloads the image.

In production, the service worker caches the shell, local sample photos, and loaded static assets. Navigation checks the network first; visited assets support offline reuse. Registration is disabled during development.

## Validation

```sh
npm run typecheck
npm run build
```

`scripts/smoke.cjs` runs browser checks against a running production server (default http://localhost:3091). Supply a Playwright module via `PLAYWRIGHT_MODULE` if it is not installed as `playwright`, and optionally `CHROME_PATH` and `BOOTH_URL`. It checks desktop/mobile overflow, custom 4R editing, JPG/PNG signatures and density, uploads, gallery persistence, camera capture with a simulated feed, retakes, cancellation, and stream cleanup. Test images and screenshots go to `.artifacts/`.

## Project map

- `lib/booth.tsx`: session state, capture sequencing, editing, saving and gallery actions.
- `lib/compose.ts`: shared canvas rendering for strips, grids and 4R output.
- `lib/layouts.ts`: reusable 4R geometry and bounds validation.
- `lib/image-metadata.ts`: JPEG/PNG print density.
- `components/CustomLayoutEditor.tsx`: interactive event designer.
- `components/*View.tsx`: overview, setup, capture, review, result and gallery.
- `app/globals.css`: responsive studio styling and print rules.

## Sample photo credits

Bundled sample/demo photos were sourced from Unsplash. They are visual examples; your own images never leave the device.

- https://images.unsplash.com/photo-1524504388940-b1c1722653e1
- https://images.unsplash.com/photo-1506794778202-cad84cf45f1d
- https://images.unsplash.com/photo-1529156069898-49953e39b3ac
- https://images.unsplash.com/photo-1534528741775-53994a69daeb
