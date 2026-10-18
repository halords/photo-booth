'use client';

import { useEffect, useState } from 'react';
import { renderSwatch } from '@/lib/compose';
import type { TemplateId } from '@/lib/types';

/** True-WYSIWYG template thumbnail, rendered by the real strip composer. */
export default function TemplateSwatch({ template }: { template: TemplateId }) {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    let cancelled = false;
    void renderSwatch(template).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [template]);
  return (
    <span className="swatch swatch-live" aria-hidden="true">
      {url ? <img src={url} alt="" /> : null}
    </span>
  );
}
