import { useEffect, useState } from 'react';
import { deleteMedia, listMedia, type MediaRecord } from '../lib/storage';
import {
  buildFilename,
  downloadPhoto,
  extFromMime,
  isFileShareSupported,
  sharePhoto,
} from '../lib/share';

interface Props {
  photoId: number;
  onClose: () => void;
  onDeleted: () => void;
}

export function PhotoDetailPage({ photoId, onClose, onDeleted }: Props) {
  const [media, setMedia] = useState<MediaRecord | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const shareSupported = isFileShareSupported();

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    (async () => {
      const all = await listMedia();
      const target = all.find((p) => p.id === photoId) ?? null;
      if (cancelled) return;
      setMedia(target);
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

  const isVideo = media?.kind === 'video';

  const onShare = async () => {
    if (!media) return;
    setBusy(true);
    setMessage(null);
    try {
      const filename = buildFilename(media.takenAt, extFromMime(media.blob.type));
      if (shareSupported) {
        const result = await sharePhoto(media.blob, filename);
        if (result === 'shared') setMessage('共有しました');
      } else {
        downloadPhoto(media.blob, filename);
        setMessage(
          'ダウンロードしました。Safari ダウンロードから「' +
            (isVideo ? 'ビデオに保存' : '写真に保存') +
            '」を選んでください',
        );
      }
    } catch (e) {
      setMessage('共有に失敗しました: ' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!media) return;
    if (!window.confirm(isVideo ? 'この動画を削除しますか？' : 'この写真を削除しますか？')) return;
    setBusy(true);
    try {
      await deleteMedia(media.id);
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
          {media ? new Date(media.takenAt).toLocaleString('ja-JP') : ''}
        </span>
        <span className="w-16" />
      </header>

      <div className="flex flex-1 items-center justify-center overflow-hidden p-2">
        {url ? (
          isVideo ? (
            // 再生 UI はブラウザネイティブに任せる。playsInline で iOS の全画面化を抑止。
            // muted は不要 (そもそも音声トラックが無い) だが自動再生はしない。
            <video
              src={url}
              controls
              playsInline
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <img src={url} alt="" className="max-h-full max-w-full object-contain" />
          )
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
          disabled={busy || !media}
          className="flex-1 rounded-full bg-white py-3 text-sm font-semibold text-black active:scale-95 disabled:opacity-50"
        >
          {shareSupported ? (isVideo ? '共有 / ビデオに保存' : '共有 / 写真に保存') : 'ダウンロード'}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy || !media}
          className="rounded-full bg-red-500/90 px-5 py-3 text-sm font-semibold active:scale-95 disabled:opacity-50"
        >
          削除
        </button>
      </div>
    </div>
  );
}
