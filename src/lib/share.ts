// Web Share API + ダウンロードフォールバック。
// iOS Safari 15+ なら files share に対応 → シェアシートから「画像を保存」で写真アプリへ。

export function isFileShareSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (!navigator.share || !navigator.canShare) return false;
  try {
    const dummy = new File([new Blob()], 'check.jpg', { type: 'image/jpeg' });
    return navigator.canShare({ files: [dummy] });
  } catch {
    return false;
  }
}

export async function sharePhoto(blob: Blob, filename: string): Promise<'shared' | 'cancelled'> {
  const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
  try {
    await navigator.share({ files: [file] });
    return 'shared';
  } catch (e) {
    // ユーザーキャンセルは AbortError。それ以外は再 throw。
    if ((e as DOMException).name === 'AbortError') return 'cancelled';
    throw e;
  }
}

/** ダウンロードリンク経由で取得させる。iOS では「ダウンロード」フォルダ(ファイルApp)に入る。 */
export function downloadPhoto(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 即 revoke すると Safari が落とせない場合があるので少し待つ
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function buildFilename(takenAt: number, ext = 'jpg'): string {
  const d = new Date(takenAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `silent-camera-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.${ext}`;
}
