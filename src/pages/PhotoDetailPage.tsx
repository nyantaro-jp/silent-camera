import { useEffect, useState } from 'react';
import { deletePhoto, listPhotos, type PhotoRecord } from '../lib/storage';
import {
  buildFilename,
  downloadPhoto,
  isFileShareSupported,
  sharePhoto,
} from '../lib/share';

interface Props {
  photoId: number;
  onClose: () => void;
  onDeleted: () => void;
}

export function PhotoDetailPage({ photoId, onClose, onDeleted }: Props) {
  const [photo, setPhoto] = useState<PhotoRecord | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const shareSupported = isFileShareSupported();

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    (async () => {
      const all = await listPhotos();
      const target = all.find((p) => p.id === photoId) ?? null;
      if (cancelled) return;
      setPhoto(target);
      if (target) {
        const u = URL.createObjectURL(target.blob);
        setUrl(u);
        revoked = u;
      }
    })();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [photoId]);

  const onShare = async () => {
    if (!photo) return;
    setBusy(true);
    setMessage(null);
    try {
      const filename = buildFilename(photo.takenAt);
      if (shareSupported) {
        const result = await sharePhoto(photo.blob, filename);
        if (result === 'shared') setMessage('共有しました');
      } else {
        downloadPhoto(photo.blob, filename);
        setMessage(
          'ダウンロードしました。Safari ダウンロードから「写真に保存」を選んでください',
        );
      }
    } catch (e) {
      setMessage('共有に失敗しました: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!photo) return;
    if (!window.confirm('この写真を削除しますか？')) return;
    setBusy(true);
    try {
      await deletePhoto(photo.id);
      onDeleted();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black text-white">
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold ring-1 ring-white/20"
        >
          ← 戻る
        </button>
        <span className="text-xs text-white/60 tabular-nums">
          {photo ? new Date(photo.takenAt).toLocaleString('ja-JP') : ''}
        </span>
        <span className="w-16" />
      </header>

      <div className="flex flex-1 items-center justify-center overflow-hidden p-2">
        {url ? (
          <img src={url} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <p className="text-sm text-white/60">読み込み中...</p>
        )}
      </div>

      {message && (
        <p className="mx-4 mb-2 rounded-md bg-white/10 px-3 py-2 text-xs text-white/90 ring-1 ring-white/20">
          {message}
        </p>
      )}

      <div
        className="flex items-center justify-around gap-4 border-t border-white/10 px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        <button
          type="button"
          onClick={onShare}
          disabled={busy || !photo}
          className="flex-1 rounded-full bg-white py-3 text-sm font-semibold text-black active:scale-95 disabled:opacity-50"
        >
          {shareSupported ? '共有 / 写真に保存' : 'ダウンロード'}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy || !photo}
          className="rounded-full bg-red-500/90 px-5 py-3 text-sm font-semibold active:scale-95 disabled:opacity-50"
        >
          削除
        </button>
      </div>
    </div>
  );
}
