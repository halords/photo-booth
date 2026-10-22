'use client';
import { useEffect, useState } from 'react';
export default function ShotImage({ file, alt = '' }: { file: File; alt?: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => { const next = URL.createObjectURL(file); setUrl(next); return () => URL.revokeObjectURL(next); }, [file]);
  return url ? <img src={url} alt={alt} /> : null;
}
