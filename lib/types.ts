export type ViewName = 'home' | 'setup' | 'capture' | 'review' | 'result';
export type LayoutId = 'strip4' | 'strip3' | 'grid' | 'single';
export type TemplateId = 'editorial' | 'film' | 'kraft';
export type FilterId = 'natural' | 'noir' | 'sepia' | 'warm';
export type CaptureMode = 'native' | 'pro';
export type Lens = 'user' | 'environment';

export interface Settings {
  eventName: string;
  layout: LayoutId;
  mode: CaptureMode;
  camera: Lens;
  countdown: number;
  filter: FilterId;
  template: TemplateId;
  caption: string;
}

export interface Shot {
  file: File;
  img: ImageBitmap | HTMLImageElement;
}

export interface StripRecord {
  id: string;
  ts: number;
  dataUrl: string;
  eventName: string;
  layout: LayoutId;
}
