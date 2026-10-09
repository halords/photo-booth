'use client';

import { BoothProvider } from '@/lib/booth';
import Shell from '@/components/Shell';

export default function Page() {
  return (
    <BoothProvider>
      <Shell />
    </BoothProvider>
  );
}
