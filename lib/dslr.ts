'use client';

import type { CameraDevice, CameraCapabilities, CameraSettings } from './types';

export interface PTPDevice {
  deviceId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  supported: boolean;
}

export interface CaptureCardDevice {
  id: string;
  name: string;
  type: 'blackmagic' | 'elgato' | 'avermedia' | 'generic';
  inputType: 'hdmi' | 'component' | 'composite' | 'sdi';
  supportedResolutions: { width: number; height: number; fps: number }[];
}

class DSLRManager {
  private devices: CameraDevice[] = [];
  private stream: MediaStream | null = null;
  private currentDevice: CameraDevice | null = null;

  isPTPSupported(): boolean {
    return 'usb' in navigator;
  }

  async getPTPDevices(): Promise<PTPDevice[]> {
    if (!this.isPTPSupported()) return [];
    try {
      // @ts-ignore - USB API
      const device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x04a9 },
          { vendorId: 0x04b0 },
          { vendorId: 0x054c },
        ]
      });
      return [{
        deviceId: device.deviceId,
        manufacturer: 'Unknown',
        model: 'PTP Device',
        serialNumber: '',
        supported: true
      }];
    } catch {
      return [];
    }
  }

  async detectCameras(): Promise<CameraDevice[]> {
    const cameras: CameraDevice[] = [];

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');

      for (const device of videoDevices) {
        const capabilities = await this.getWebcamCapabilities(device.deviceId);
        const label = device.label || 'Camera';
        const isLikelyDSLR = label.toLowerCase().includes('dslr') ||
                             label.toLowerCase().includes('eos') ||
                             label.toLowerCase().includes('nikon') ||
                             label.toLowerCase().includes('sony') ||
                             label.toLowerCase().includes('canon');

        const isCaptureCard = label.toLowerCase().includes('blackmagic') ||
                             label.toLowerCase().includes('elgato') ||
                             label.toLowerCase().includes('avermedia') ||
                             label.toLowerCase().includes('cam link') ||
                             label.toLowerCase().includes('capture');

        let source: 'webcam' | 'dslr' | 'capturecard' = 'webcam';
        let type: 'webcam' | 'dslr' | 'capturecard' = 'webcam';

        if (isCaptureCard) {
          source = 'capturecard';
          type = 'capturecard';
        } else if (isLikelyDSLR) {
          source = 'dslr';
          type = 'dslr';
        }

        cameras.push({
          id: device.deviceId,
          label: label,
          source,
          type,
          capabilities,
          connected: true
        });
      }
    } catch (e) {
      console.error('Error detecting cameras:', e);
    }

    this.devices = cameras;
    return cameras;
  }

  private async getWebcamCapabilities(deviceId: string): Promise<CameraCapabilities> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } }
      });

      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as MediaTrackCapabilities;

      stream.getTracks().forEach(t => t.stop());

      return {
        maxResolution: {
          width: (capabilities.width as { max?: number } | undefined)?.max || 1920,
          height: (capabilities.height as { max?: number } | undefined)?.max || 1080
        },
        minResolution: {
          width: (capabilities.width as { min?: number } | undefined)?.min || 640,
          height: (capabilities.height as { min?: number } | undefined)?.min || 480
        },
        supportsHD: ((capabilities.width as { max?: number } | undefined)?.max || 0) >= 1280,
        supports4K: ((capabilities.width as { max?: number } | undefined)?.max || 0) >= 3840,
        supportsRAW: false,
        supportsFlash: false,
        supportsManual: !!(capabilities as unknown as Record<string, unknown>).brightness || !!(capabilities as unknown as Record<string, unknown>).contrast
      };
    } catch {
      return {
        maxResolution: { width: 1920, height: 1080 },
        minResolution: { width: 640, height: 480 },
        supportsHD: true,
        supports4K: false,
        supportsRAW: false,
        supportsFlash: false,
        supportsManual: false
      };
    }
  }

  async startPreview(
    device: CameraDevice,
    videoElement: HTMLVideoElement,
    settings?: Partial<CameraSettings>
  ): Promise<void> {
    this.stopPreview();

    const defaultSettings: CameraSettings = {
      resolution: device.capabilities.maxResolution,
      frameRate: 30,
      focusMode: 'auto',
      flashMode: 'off',
      exposure: 0,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      ...settings
    };

    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: { exact: device.id },
        width: { ideal: defaultSettings.resolution.width },
        height: { ideal: defaultSettings.resolution.height },
        frameRate: { ideal: defaultSettings.frameRate }
      },
      audio: false
    };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = this.stream;
    videoElement.muted = true;
    videoElement.playsInline = true;
    await videoElement.play();
    this.currentDevice = device;
  }

  stopPreview(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.currentDevice = null;
  }

  capturePhoto(mirrored: boolean = false): HTMLCanvasElement | null {
    if (!this.stream) return null;

    const track = this.stream.getVideoTracks()[0];
    if (!track) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const streamSettings = track.getSettings();
    canvas.width = streamSettings.width || 1920;
    canvas.height = streamSettings.height || 1080;

    const video = document.createElement('video');
    video.srcObject = this.stream;
    video.play();

    if (mirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  getCurrentDevice(): CameraDevice | null {
    return this.currentDevice;
  }

  getDevices(): CameraDevice[] {
    return this.devices;
  }

  isReady(): boolean {
    return this.stream !== null && this.currentDevice !== null;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }
}

export const dslrManager = new DSLRManager();
export { DSLRManager };
