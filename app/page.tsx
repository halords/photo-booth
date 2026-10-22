'use client';

import { BoothProvider, useBooth } from '@/lib/booth';
import Shell from '@/components/Shell';
import HomeView from '@/components/HomeView';
import SetupView from '@/components/SetupView';
import CaptureView from '@/components/CaptureView';
import ReviewView from '@/components/ReviewView';
import ResultView from '@/components/ResultView';
import GalleryView from '@/components/GalleryView';

function ViewRouter() {
  const { view } = useBooth();

  switch (view) {
    case 'home': return <HomeView />;
    case 'setup': return <SetupView />;
    case 'capture': return <CaptureView />;
    case 'review': return <ReviewView />;
    case 'result': return <ResultView />;
    case 'gallery': return <GalleryView />;
    default: return <HomeView />;
  }
}

export default function Home() {
  return (
    <BoothProvider>
      <Shell>
        <ViewRouter />
      </Shell>
    </BoothProvider>
  );
}
