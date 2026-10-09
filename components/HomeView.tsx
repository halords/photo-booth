'use client';

import { useBooth } from '@/lib/booth';

export default function HomeView() {
  const { go, gallery, openRecord, removeRecord } = useBooth();

  return (
    <section className="view">
      <p className="kicker">The pocket photo booth</p>
      <h1>
        Shoot it <em>like it&apos;s 1975.</em>
      </h1>
      <p className="lede">
        Four frames, one strip, no account, no cloud. Your iPhone&apos;s own
        camera — or the in-app pro camera — does the shooting. This app does
        the booth.
      </p>
      <button className="btn btn-primary" onClick={() => go('setup')} type="button">
        New session
      </button>

      <div className="section-head">
        <h2>Session gallery</h2>
        <span className="count">
          {gallery.length ? `${gallery.length} STRIP${gallery.length > 1 ? 'S' : ''}` : ''}
        </span>
      </div>
      {gallery.length === 0 ? (
        <p className="muted">
          No strips yet. Your finished strips live here, on this device only.
        </p>
      ) : (
        <div className="gallery">
          {gallery.map((it) => (
            <div className="g-item" key={it.id}>
              <img
                src={it.dataUrl}
                alt={it.eventName || 'Photo booth strip'}
                onClick={() => openRecord(it)}
              />
              <div className="g-meta">
                <span>{it.eventName || 'Untitled'}</span>
                <button
                  className="g-del"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void removeRecord(it.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
