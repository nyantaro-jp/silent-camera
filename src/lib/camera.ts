// getUserMedia の薄いラッパー。Step 3 時点では前後切替・ズーム等はまだ無し。
// Step 5 以降で機能追加していく前提でここに集約しておく。

export type Facing = 'user' | 'environment';

export interface StartCameraOptions {
  facing?: Facing;
  // 任意の解像度ヒント。指定しなければブラウザ任せ(=デバイス上限相当)。
  width?: number;
  height?: number;
}

/**
 * カメラを起動して MediaStream を返す。失敗時は throw。
 * audio は明示的に false。バイブ・音声系も使わないので「完全無音」を保証。
 */
export async function startCamera(options: StartCameraOptions = {}): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('このブラウザは getUserMedia に対応していません');
  }

  const { facing = 'environment', width, height } = options;

  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: { ideal: facing },
      ...(width ? { width: { ideal: width } } : {}),
      ...(height ? { height: { ideal: height } } : {}),
    },
  };

  return await navigator.mediaDevices.getUserMedia(constraints);
}

/** ストリーム上の全トラックを停止。画面遷移時のリーク防止に必ず呼ぶ。 */
export function stopStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}
