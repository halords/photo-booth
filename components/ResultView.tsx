'use client';

import { useBooth } from '@/lib/booth';

export default function ResultView() {
  const { result, share, download, go } = useBooth();

  if (!result) return null;

  return (
    <section className="view">
      <p className="kicker">04 — Done</p>
      <h2>The strip</h2>
      <div className="preview-frame">
        <img src={result.dataUrl} alt="Finished photo booth strip" />
      </div>
      <button className="btn btn-primary" type="button" onClick={() => void share()}>
        Share…
      </button>
      <div className="row">
        <button className="btn btn-ghost" type="button" onClick={() => void download()}>
          Download
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => go('setup')}>
          New session
        </button>
      </div>
      <p className="hint">
        Share opens the iOS share sheet — save to Photos, AirDrop it, send it
        anywhere.
      </p>
    </section>
  );
}
