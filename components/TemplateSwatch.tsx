'use client';

import { useEffect, useState } from 'react';
import { renderSwatch } from '@/lib/compose';
import type { TemplateId } from '@/lib/types';

/** True-WYSIWYG template thumbnail, rendered by the real strip composer. */
export default function TemplateSwatch({ template }: { template: TemplateId }) {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    setUrl(renderSwatch(template));
  }, [template]);
  return (
    <span className="swatch swatch-live" aria-hidden="true">
      {url ? <img src={url} alt="" /> : null}
    </span>
  );
}
