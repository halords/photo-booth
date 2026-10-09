# Booth — a pocket photo booth (Next.js)

A progressive web app that turns an iPhone into a photo booth. Built with
**Next.js 15 + TypeScript + App Router**, deployed on Vercel from this repo —
every push to `main` redeploys automatically.

## Where things live

| Path | What it does |
|---|---|
| `app/page.tsx` | Entry — wraps everything in `BoothProvider` |
| `app/layout.tsx` | Fonts (Fraunces + Inter via `next/font`), metadata, viewport |
| `app/globals.css` | All styling (anti-AI-slop editorial theme) |
| `components/Shell.tsx` | Masthead, view router, footer, toast |
| `components/HomeView.tsx` | Hero + session gallery |
| `components/SetupView.tsx` | Event, layout, capture mode, lens, countdown, template, filter, caption |
| `components/CaptureView.tsx` | Native shutter flow **and** pro viewfinder |
| `components/ReviewView.tsx` | Live strip preview, template/filter/caption tweaks |
| `components/ResultView.tsx` | Finished strip, share / download |
| `components/pickers.tsx` | `Segmented` control + `FieldLabel` |
| `components/ServiceWorker.tsx` | Registers `/sw.js` on load |
| `lib/booth.tsx` | **The brain** — `BoothProvider` + `useBooth()` hook: view state machine, native capture, pro-camera countdown session, strip finalize, gallery |
| `lib/compose.ts` | Canvas strip composer: layouts × templates (editorial / film / kraft), pixel filters |
| `lib/procamera.ts` | getUserMedia viewfinder + frame capture |
| `lib/capture.ts` | Native-camera file-input capture |
| `lib/share.ts` | Web Share API + download fallback |
| `lib/store.ts` | IndexedDB gallery (on-device only) |
| `lib/types.ts` | Shared TypeScript types |
| `public/` | `manifest.json`, `icon.svg`, `sw.js` (served statically) |

## The usual revisions

- **New strip template** → add a renderer in `lib/compose.ts`
  (`RENDERERS` map + entry in `TEMPLATES`), it appears in setup + review
  automatically.
- **New layout** → add to `LAYOUTS` in `lib/compose.ts` and a card in
  `components/SetupView.tsx` (`LAYOUT_META`).
- **New filter** → one branch in `applyFilter` (`lib/compose.ts`) + one
  option in the `Segmented` lists in setup/review.
- **Capture flow changes** → `lib/booth.tsx` (`startPro` / `runProLoop` /
  `shootNative`); UI in `components/CaptureView.tsx`.

## Flow

1. **Home** — new session, gallery of finished strips (IndexedDB, on-device).
2. **Setup** — event name, layout, capture mode (Native / Pro), lens,
   countdown (pro only), template, filter, caption.
3. **Capture** — native: shutter opens the iPhone Camera app per shot;
   pro: in-app viewfinder with auto-fire countdown.
4. **Compose** — live preview; switch template/filter/caption freely.
5. **Done** — iOS share sheet, download fallback.

## Dev

```bash
npm install
npm run dev
```

## Notes

- iOS Safari requires camera/file selection from a direct tap — the native
  path is deliberately one-tap-per-shot. Auto-fire lives in pro mode.
- Installed iOS PWAs can't use `getUserMedia` — pro mode falls back to
  native automatically.
- No backend. Photos never leave the device.
