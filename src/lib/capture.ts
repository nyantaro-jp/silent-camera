// 撮影処理。<audio>/Audio API/Web Audio/vibrate は一切使わない。
// 視覚フィードバックは UI 側で実施する。

export interface CaptureResult {
  blob: Blob;
  width: number;
  height: number;
  takenAt: number;
}

/**
 * 動画フレームを Canvas に焼いて Blob 化する。
 * iOS Safari はまだ ImageCapture API を持たないため Canvas 経由が無難。
 */
export async function captureFrame(
  video: HTMLVideoElement,
  options: { type?: 'image/jpeg' | 'image/png'; quality?: number } = {},
): Promise<CaptureResult> {
  const { type = 'image/jpeg', quality = 0.95 } = options;

  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new Error('カメラ映像の準備ができていません');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context を取得できませんでした');
  ctx.drawImage(video, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
  if (!blob) throw new Error('画像 Blob の生成に失敗しました');

  return { blob, width, height, takenAt: Date.now() };
}
