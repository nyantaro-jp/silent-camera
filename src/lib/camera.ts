// getUserMedia ラッパー + ズーム / トーチ / 解像度 / 前後切替の薄い API。
// MediaTrackCapabilities 等の zoom/torch 型は src/types/media.d.ts で拡張済み。

import type { Resolution } from './settings';

export type Facing = 'user' | 'environment';

export interface StartCameraOptions {
  facing?: Facing;
  resolution?: Resolution;
}

const RES_MAP: Record<Resolution, { width: number; height: number } | null> = {
  high: null, // ブラウザ任せ ≒ デバイス上限
  medium: { width: 1920, height: 1080 },
  low: { width: 1280, height: 720 },
};

/**
 * カメラを起動して MediaStream を返す。
 * audio:false 固定 + バイブ・音声系も使わない方針 → 完全無音。
 */
export async function startCamera(options: StartCameraOptions = {}): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('このブラウザは getUserMedia に対応していません');
  }

  const { facing = 'environment', resolution = 'high' } = options;
  const dim = RES_MAP[resolution];

  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: { ideal: facing },
      ...(dim ? { width: { ideal: dim.width }, height: { ideal: dim.height } } : {}),
    },
  };

  return await navigator.mediaDevices.getUserMedia(constraints);
}

export function stopStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

// ---------- 前後カメラ ----------

/**
 * 前後どちらも実在するか調べる。labels が空でも deviceId 数で粗く判定できる。
 * iOS は permission 付与前は空ラベルでも 1 件しか返さないことがあるので、
 * 実際の切替操作はトライ&エラー方式にし、ここはあくまでヒント用途。
 */
export async function hasMultipleCameras(): Promise<boolean> {
  if (!navigator.mediaDevices?.enumerateDevices) return false;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput').length > 1;
  } catch {
    return false;
  }
}

export function flipFacing(f: Facing): Facing {
  return f === 'user' ? 'environment' : 'user';
}

// ---------- ズーム ----------

export interface ZoomCapability {
  min: number;
  max: number;
  step: number;
  current: number;
}

export function getZoomCapability(stream: MediaStream): ZoomCapability | null {
  const track = stream.getVideoTracks()[0];
  if (!track) return null;
  const caps = track.getCapabilities?.();
  if (!caps?.zoom) return null;
  const settings = track.getSettings();
  return {
    min: caps.zoom.min,
    max: caps.zoom.max,
    step: caps.zoom.step || 0.1,
    current: settings.zoom ?? caps.zoom.min,
  };
}

export async function applyZoom(stream: MediaStream, value: number): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  await track.applyConstraints({ advanced: [{ zoom: value }] });
}

// ---------- トーチ(ライト) ----------

export function isTorchSupported(stream: MediaStream): boolean {
  const track = stream.getVideoTracks()[0];
  if (!track) return false;
  const caps = track.getCapabilities?.();
  return !!caps?.torch;
}

export async function setTorch(stream: MediaStream, on: boolean): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track) return;
  await track.applyConstraints({ advanced: [{ torch: on }] });
}
