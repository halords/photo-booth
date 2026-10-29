export type ViewName = 'home' | 'setup' | 'capture' | 'review' | 'result' | 'gallery' | 'settings';
export type LayoutId = 'strip2' | 'strip3' | 'strip4' | 'strip6' | 'grid2x2' | 'grid3x3' | 'single' | 'collage' | 'custom4r';
export type TemplateId = 'editorial' | 'film' | 'kraft' | 'polaroid' | 'polaroid-white' | 'modern' | 'vintage' | 'neon' | 'halloween' | 'christmas';
export type FilterId = 'natural' | 'noir' | 'sepia' | 'warm' | 'vivid' | 'cool' | 'fade' | 'dramatic' | 'vintage-film' | 'crossprocess' | 'teal-orange';
export type CaptureMode = 'native' | 'pro' | 'dslr' | 'video' | 'upload';
export type Lens = 'user' | 'environment';
export type CameraSource = 'webcam' | 'dslr' | 'capturecard' | 'ipcamera';
export type StripOrientation = 'portrait' | 'landscape';
export type StripSize = 'standard' | 'mini' | 'wide' | 'square';
export type ExportFormat = 'jpg' | 'png' | 'pdf';
export type PrintDPI = 150 | 300 | 600;
export type StripMode = 'single' | 'same' | 'different';
export type OverlayType = 'hat' | 'glasses' | 'mustache' | 'frame' | 'text' | 'custom';

export interface Settings {
  stripMode: StripMode;
  customLayout: CustomLayout;
  stripBackground: PrintBackground;
  eventName: string;
  layout: LayoutId;
  mode: CaptureMode;
  camera: Lens;
  cameraSource: CameraSource;
  countdown: number;
  filter: FilterId;
  template: TemplateId;
  caption: string;
  stripSize: StripSize;
  printDPI: PrintDPI;
  soundEnabled: boolean;
  flashEnabled: boolean;
  countdownSound: boolean;
  mirrorMode: boolean;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  showGrid: boolean;
  greenScreenEnabled: boolean;
  greenScreenColor: string;
  backgroundImage: string | null;
  frameColor: string;
  showDate: boolean;
}

/** Coordinates are percentages of a 4R sheet, independent of export resolution. */
export interface PhotoPlaceholder {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}
export interface CustomLayout {
  orientation: StripOrientation;
  decoration: 'minimal' | 'birthday' | 'celebration' | 'halloween' | 'christmas';
  slots: PhotoPlaceholder[];
  backgroundDataUrl: string | null;
  backgroundOptions?: BackgroundOptions;
}

export interface BackgroundOptions {
  fit: 'cover' | 'contain' | 'stretch';
  x: number;
  y: number;
  showText: boolean;
}
export interface PrintBackground extends BackgroundOptions {
  dataUrl: string | null;
}

export interface Shot {
  file: File;
  img: ImageBitmap | HTMLImageElement;
  timestamp: number;
  cameraSource: CameraSource;
  dslrSettings?: DSLRShotSettings;
  edit?: { zoom: number; x: number; y: number; rotation: number; mirror: boolean };
}

export interface DSLRShotSettings {
  iso: number;
  aperture: number;
  shutterSpeed: string;
  whiteBalance: string;
  flashUsed: boolean;
}

export interface StripRecord {
  assets?: SessionAsset[];
  dpi?: number;
  stripMode?: StripMode;
  printOrientation?: StripOrientation;
  id: string;
  ts: number;
  dataUrl: string;
  thumbnailUrl: string;
  eventName: string;
  layout: LayoutId;
  template: TemplateId;
  photos: string[];
  shareUrl?: string;
  caption?: string;
  filter?: FilterId;
  favorite?: boolean;
  width?: number;
  height?: number;
}

export interface SessionAsset {
  name: string;
  type: string;
  size: number;
  kind: 'layout' | 'shot' | 'gif';
  width?: number;
  height?: number;
}

export interface CameraDevice {
  id: string;
  label: string;
  source: CameraSource;
  type: 'webcam' | 'dslr' | 'capturecard';
  capabilities: CameraCapabilities;
  connected: boolean;
}

export interface CameraCapabilities {
  maxResolution: { width: number; height: number };
  minResolution: { width: number; height: number };
  supportsHD: boolean;
  supports4K: boolean;
  supportsRAW: boolean;
  supportsFlash: boolean;
  supportsManual: boolean;
  isoRange?: { min: number; max: number };
  apertureRange?: { min: number; max: number };
  shutterSpeeds?: string[];
}

export interface CameraState {
  source: CameraSource;
  device: CameraDevice | null;
  devices: CameraDevice[];
  isLive: boolean;
  isCapturing: boolean;
  error: string | null;
  settings: CameraSettings;
}

export interface CameraSettings {
  resolution: { width: number; height: number };
  frameRate: number;
  iso?: number;
  aperture?: number;
  shutterSpeed?: string;
  whiteBalance?: string;
  focusMode: 'auto' | 'manual';
  flashMode: 'auto' | 'on' | 'off';
  exposure: number;
  brightness: number;
  contrast: number;
  saturation: number;
}

export interface Overlay {
  id: string;
  type: OverlayType;
  src?: string;
  text?: string;
  font?: string;
  color?: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  zIndex: number;
}

export interface EventConfig {
  id: string;
  name: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  customBackground?: string;
  customOverlay?: Overlay[];
  tagline?: string;
  date?: string;
  location?: string;
}

export interface PrintSettings {
  dpi: PrintDPI;
  size: StripSize;
  copies: number;
  borderless: boolean;
  cutMarks: boolean;
  bleed: number;
}

export interface ShareOptions {
  format: ExportFormat;
  quality: number;
  includeWatermark: boolean;
  watermarkText?: string;
  watermarkPosition?: 'top' | 'bottom' | 'corner';
  socialMediaOptimized: boolean;
}

export interface CountdownConfig {
  duration: number;
  sound: boolean;
  flashEffect: boolean;
  voicePrompt: boolean;
  text?: string;
}

export interface GalleryFilter {
  event?: string;
  dateFrom?: Date;
  dateTo?: Date;
  template?: TemplateId;
}

export interface Statistics {
  totalStrips: number;
  totalPhotos: number;
  totalEvents: number;
  totalPrints: number;
  mostUsedTemplate: TemplateId;
  mostUsedLayout: LayoutId;
}

export interface GreenScreenSettings {
  enabled: boolean;
  keyColor: string;
  tolerance: number;
  spillSuppression: number;
  edgeFeathering: number;
  customBackground: string | null;
}

export interface VideoSettings {
  duration: number;
  fps: number;
  format: 'gif' | 'mp4' | 'webm';
  loop: boolean;
  boomerang: boolean;
  slowMotion: boolean;
  speed: number;
}

export interface ProStatus {
  running: boolean;
  label: string;
  count: number | null;
  status: string;
  cameraReady: boolean;
  batteryLevel?: number;
}

export interface CaptureProgress {
  current: number;
  total: number;
  lastCapture: number | null;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
}
