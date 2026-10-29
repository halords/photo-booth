# Pocket Photo Booth

A private photo booth for everyday moments and events. Built with Next.js 15, React 19, TypeScript, browser canvas, and browser Cache Storage.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. Live camera access requires localhost or HTTPS and browser permission. For a production server, use `npm run build` followed by `npm start`. A phone accessing a computer over plain HTTP should use uploads; serve HTTPS for live capture.

## Create a keepsake

Choose a layout and style, take a timed series with a live camera, use the phone camera input, or upload images. Review each photo, reorder, crop, rotate, flip, and replace it. Apply a shared filter, frame color, caption, and date. Save the finished print in the local gallery, download JPG or PNG, share through supported system share sheets, or print.

The gallery includes search, favorites, sorting, and deletion. Settings persist between visits. Camera tracks stop when leaving capture, hiding the page, or ending a session. Sound, screen flash, mirroring, and framing guides are optional.

## Print quality, two-strip sheets, and complete sessions

- Choose **300 DPI** or **600 DPI** in setup. Layout dimensions and JPEG/PNG density metadata follow the selection. Higher DPI adds output pixels; it cannot restore missing source detail.
- Strip layouts support **One strip**, **Two - same photos**, and **Two - different photos**. Paired strips fill a 4 x 6 inch sheet, cut into two 2 x 6 inch strips. Different-photo mode captures twice as many photos: the first half fills strip A, the second half fills strip B. Previews, retakes, editing, and exports use this order.
- Download an original shot immediately in capture, or open **Individual shots** on the result screen. Original downloads are byte-for-byte camera/upload files; edits and filters appear in the final layout and GIF.
- **Download session ZIP** puts the lossless print layout, original individual shots, and GIF inside one named folder. **Save folder to device** uses a directory picker where available, with a ZIP fallback on phones. Individual save actions use the system share sheet where supported.
- GIF generation runs in a worker at 800 x 800, 650 ms per photo, looping continuously. Animation resolution is independent of photo/print resolution.

## Seasonal photo booth designs

In **Photo booth â†’ Frame & filter**, choose **Halloween** for the **PGLU Halloween Special** design or **Christmas** for an evergreen holiday design. Halloween includes pumpkins, bats, a moon, cobwebs, and a ghost; Christmas includes evergreen sprigs, ornaments, snowflakes, and gold stars. The designs work with every strip and grid layout and appear in previews, saved gallery images, and JPG/PNG exports.

For **Custom 4R**, choose **PGLU Halloween Special** or **Christmas** under **Occasion style**. Both portrait and landscape prints are supported. Selecting a seasonal frame also selects its matching 4R occasion style. Personal captions and event names override the theme's default wording. Uploaded event artwork replaces the decorative background until removed. Seasonal selections persist between visits and in saved layout files.

## Custom 4R event layouts

Select **Photo booth -> Custom 4R** under Layout & camera.

- At 300 DPI, portrait is 4 x 6 inches / 1200 x 1800 pixels and landscape is 6 x 4 inches / 1800 x 1200 pixels. At 600 DPI, both dimensions double. Exports include the selected print density.
- Add one to six editable photo placeholders. Drag a frame to position it, drag its corner to resize, or use numeric fields for size, position, and rotation. Arrow keys move a focused frame; Shift moves it five percentage points.
- Choose a birthday, celebration, minimal, PGLU Halloween Special, or Christmas background, or upload your event artwork. Add the occasion name and message in Personal touches.
- Photos fill placeholders in their numbered order. Overlapping frames layer in that same order. The required number of captures follows the placeholder count.
- Change frame placement, orientation, and background again in review. Use the Photos tab to adjust the photo inside a frame. Add/remove frames during setup so the number of captured photos stays consistent in review.
- Save a layout JSON file and load it during setup to reuse the same event design on another browser or device.
- The last design is retained in browser preferences. Very large background artwork may remain session-only when browser preferences storage is full.
- Printing requests a 4R page size. Select 4R paper and actual size in the printer dialog; borderless printing depends on printer support.

## Custom backgrounds and text-free prints

Under **Photo booth â†’ Frame & filter â†’ Your own background**, upload a JPG, PNG, or WebP design for any strip, grid, or 4R layout. The same controls are available in **Frame** during review and inside the custom 4R editor. Replace or remove the artwork at any time.

- **Fill frame** crops the edges to cover the print; **Fit entire design** keeps all artwork visible; **Stretch to frame** matches the print dimensions. Adjust horizontal/vertical placement or center it again. Frame color fills transparent or uncovered areas.
- Turn off **Show frame text** to remove all app-added titles, captions, branding, dates, strip numbers, and film photo numbers. Text already included in uploaded artwork remains part of that artwork. This switch also works with built-in themes without an uploaded background.
- Artwork replaces built-in background decorations and sits behind the photos. Photo positions stay unchanged when text is hidden, so custom designs keep their alignment.
- Strip and 4R artwork/settings are kept separately. 4R layout files include artwork, fitting, placement, and text visibility. Uploads stay local, preserve transparency, and are resized to at most 3200 pixels on the longest edge. If browser preferences storage is full, a notice explains that artwork will remain available only for the current session.

## Privacy, storage, and compatibility

Captured and uploaded photos retain their original files and dimensions. The phone-camera input keeps the file supplied by the camera app. Live capture uses the browser ImageCapture still-photo API at its default settings when available, otherwise the highest negotiated video-frame resolution. USB webcams, DSLR webcam drivers, and capture cards cannot expose more detail than their driver provides; upload original DSLR still files for full sensor resolution. HEIC decoding depends on browser support.

New gallery sessions use browser Cache Storage, without a photo database. The complete session includes a lossless PNG layout, untouched individual files, and an 800 x 800 looping GIF. Reopening a cached session retains all these downloads. Existing IndexedDB galleries from older versions remain readable, but new sessions and favorite changes are written to the cache. Download valuable sessions before clearing browser storage; browsers can evict cached data.

Sharing a **24-hour link** explicitly uploads the session ZIP to a private R2 bucket, or to temporary storage on a single Node server when R2 is not configured. Friends see a browser preview gallery and can download individual items or the entire ZIP. No manual unzipping is needed for previews. Files stay local until this link action. See [temporary sharing setup](docs/temporary-sharing.md) for keys, CORS, automatic deletion, hosting requirements, and limits. System sharing and save-to-device support vary by browser; ZIP downloads work as a fallback.

In production, the service worker caches the shell, local sample photos, and loaded static assets. Navigation checks the network first; visited assets support offline reuse. Registration is disabled during development.

## Validation

```sh
npm run typecheck
npm run build
npm run test:sessions
```

`scripts/smoke.cjs` runs browser checks against a running production server (default http://localhost:3091). Supply a Playwright module via `PLAYWRIGHT_MODULE` if it is not installed as `playwright`, and optionally `CHROME_PATH` and `BOOTH_URL`. It checks desktop/mobile overflow, custom 4R editing, JPG/PNG signatures and density, uploads, gallery persistence, camera capture with a simulated feed, retakes, cancellation, and stream cleanup. Test images and screenshots go to `.artifacts/`.

`npm run test:seasonal` uses the same environment variables to check Halloween and Christmas strips, portrait/landscape 4R prints, theme persistence, layout file round trips, custom captions/backgrounds, gallery names, and mobile layout. Its rendered images and screenshots go to `.artifacts/seasonal/`.

`npm run test:backgrounds` checks custom artwork, transparency, fit/placement controls, saved settings, layout round trips, mobile layout, and final exports with all frame text disabled. Its artifacts go to `.artifacts/backgrounds/`.

## Project map

- `lib/booth.tsx`: session state, capture sequencing, editing, saving and gallery actions.
- `lib/compose.ts`: shared canvas rendering for strips, grids and 4R output.
- `lib/seasonal.ts`: PGLU Halloween and Christmas palettes, wording, and canvas artwork.
- `lib/layouts.ts`: reusable 4R geometry and bounds validation.
- `lib/image-metadata.ts`: JPEG/PNG print density.
- `components/CustomLayoutEditor.tsx`: interactive event designer.
- `components/*View.tsx`: overview, setup, capture, review, result and gallery.
- `app/globals.css`: responsive studio styling and print rules.

## Sample photo credits

Bundled sample/demo photos were sourced from Unsplash. They are visual examples. Photos leave the device only when you choose to share them.

- https://images.unsplash.com/photo-1524504388940-b1c1722653e1
- https://images.unsplash.com/photo-1506794778202-cad84cf45f1d
- https://images.unsplash.com/photo-1529156069898-49953e39b3ac
- https://images.unsplash.com/photo-1534528741775-53994a69daeb

`test:sessions` checks original-file byte preservation above 2400px, default still-camera capture, both paired-strip modes, 300/600 DPI output, GIFs, folder/ZIP downloads, cache-only persistence, shared browser previews, original downloads from a fresh browser, mobile layout, invalid uploads, and expiry. Run a production server with `BOOTH_SHARE_STORAGE=local` and a test-only `BOOTH_SHARE_DIR` for the local-cache tests.

`test:r2-live` requires configured credentials and synthetic artifacts from `test:sessions`; it uploads one test ZIP, verifies signed upload/download bytes, and leaves the object for inspection. `node scripts/r2-live-test.cjs --delete` deletes only the recorded test object and verifies removal. The script never prints credentials.
