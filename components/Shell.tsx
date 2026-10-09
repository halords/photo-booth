'use client';

import { useBooth } from '@/lib/booth';
import HomeView from './HomeView';
import SetupView from './SetupView';
import CaptureView from './CaptureView';
import ReviewView from './ReviewView';
import ResultView from './ResultView';

export default function Shell() {
  const { view, toastMsg } = useBooth();
  return (
    <>
      <header className="masthead">
        <span className="wordmark">Booth</span>
        <span className="masthead-meta">PWA · Nº 01</span>
      </header>
      <main className="wrap">
        {view === 'home' && <HomeView />}
        {view === 'setup' && <SetupView />}
        {view === 'capture' && <CaptureView />}
        {view === 'review' && <ReviewView />}
        {view === 'result' && <ResultView />}
      </main>
      <footer className="colophon">
        <span>Booth · a pocket photo booth</span>
        <span>Photos never leave this device</span>
      </footer>
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </>
  );
}
