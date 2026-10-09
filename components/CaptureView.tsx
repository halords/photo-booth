'use client';

import { useEffect, useRef } from 'react';
import { useBooth } from '@/lib/booth';
import { Compose } from '@/lib/compose';

function NativeCapture() {
  const { settings, shots, shootNative, go } = useBooth();
  const inputRef = useRef<HTMLInputElement>(null);
  const n = Compose.shotsFor(settings.layout);
  const done = shots.filter(Boolean).length;
  const complete = shots.length === n && shots.every(Boolean);

  const shoot = (index: number) => {
    if (inputRef.current) void shootNative(inputRef.current, index);
  };

  return (
    <div id="native-wrap">
      <div className="dots">
        {Array.from({ length: n }).map((_, i) => (
          <div
            key={i}
            className={`dot${shots[i] ? ' done' : i === done ? ' now' : ''}`}
          >
            {i + 1}
          </div>
        ))}
      </div>

      {done < n && (
        <button className="shutter" aria-label="Open camera" type="button"
          onClick={() => {
            const next = shots.findIndex((s) => !s);
            if (next >= 0) shoot(next);
          }}
        >
          <span className="shutter-ring" />
          <span className="shutter-label">Open camera</span>
        </button>
      )}
      <p className="hint">
        Opens your iPhone&apos;s native camera. Take the shot, then you&apos;re
        brought right back.
      </p>

      <div className="thumbs">
        {Array.from({ length: n }).map((_, i) => (
          <div key={i} className={`thumb${shots[i] ? '' : ' empty'}`}>
            {shots[i] ? (
              <>
                <ThumbImg file={shots[i]!.file} />
                <span className="n">{i + 1}</span>
                <button
                  className="retake"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    shoot(i);
                  }}
                >
                  Retake
                </button>
              </>
            ) : (
              <>{i + 1}</>
            )}
          </div>
        ))}
      </div>

      <div className="row">
        <button
          className="btn btn-primary"
          type="button"
          disabled={!complete}
          onClick={() => go('review')}
        >
          Review strip
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => go('setup')}>
          Back
        </button>
      </div>

      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept="image/*"
        capture={settings.camera}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}

function ThumbImg({ file }: { file: File }) {
  const url = URL.createObjectURL(file);
  // Revoke on unmount is skipped for brevity; object URLs are short-lived here.
  return <img src={url} alt="" />;
}

function ProCapture() {
  const { settings, shots, pro, startPro, flipLens, cancelPro, go } = useBooth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const startedRef = useRef(false);
  const n = Compose.shotsFor(settings.layout);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const video = videoRef.current;
    if (video) startPro(video);
    return () => {
      cancelPro();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div id="pro-wrap">
      <div className="viewfinder">
        <video ref={videoRef} playsInline muted />
        <div className="vf-grid" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="vf-top">
          <span>{pro.label || `Shot 1 of ${n}`}</span>
          <button
            className="vf-chip"
            type="button"
            onClick={() => videoRef.current && flipLens(videoRef.current)}
          >
            Flip
          </button>
        </div>
        <div className="vf-count" hidden={pro.count === null}>
          {pro.count}
        </div>
        <div className="vf-bottom">
          <span className="vf-status">{pro.status}</span>
          <button className="vf-chip" type="button" onClick={() => { cancelPro(); go('setup'); }}>
            Cancel
          </button>
        </div>
      </div>

      <div className="thumbs">
        {Array.from({ length: n }).map((_, i) => (
          <div key={i} className={`thumb${shots[i] ? '' : ' empty'}`}>
            {shots[i] ? <ThumbImg file={shots[i]!.file} /> : <>{i + 1}</>}
          </div>
        ))}
      </div>
      <p className="hint">
        Pro camera auto-fires on the countdown. Shots land above as they&apos;re
        taken.
      </p>
    </div>
  );
}

export default function CaptureView() {
  const { settings } = useBooth();
  const n = Compose.shotsFor(settings.layout);

  return (
    <section className="view">
      <p className="kicker">02 — Capture</p>
      <h2>{settings.mode === 'pro' ? 'Pro camera' : `Shot 1 of ${n}`}</h2>
      {settings.mode === 'pro' ? <ProCapture /> : <NativeCapture />}
    </section>
  );
}
