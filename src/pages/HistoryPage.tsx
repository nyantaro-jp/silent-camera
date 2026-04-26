import { useEffect, useState } from 'react';
import { Thumbnail } from '../components/Thumbnail';
import { listPhotos, estimateUsageBytes, type PhotoRecord } from '../lib/storage';

interface Props {
  onClose: () => void;
  onOpenPhoto: (id: number) => void;
  refreshKey?: number;
}

const WARN_BYTES = 50 * 1024 * 1024;

export function HistoryPage({ onClose, onOpenPhoto, refreshKey }: Props) {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [usage, setUsage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [list, used] = await Promise.all([listPhotos(), estimateUsageBytes()]);
      if (cancelled) return;
      setPhotos(list);
      setUsage(used);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const overWarn = usage !== null && usage > WARN_BYTES;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-black text-white">
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
        <h1 className="text-base font-semibold">撮影履歴</h1>
        <span className="w-16" />
      </header>

      {overWarn && (
        <div className="mx-4 mb-2 rounded-md bg-amber-500/20 px-3 py-2 text-xs text-amber-100 ring-1 ring-amber-400/40">
          ストレージ使用量が {(usage! / 1024 / 1024).toFixed(0)} MB を超えました。不要な画像を削除するか、写真アプリへ保存して整理してください。
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 pb-8">
        {loading ? (
          <p className="mt-12 text-center text-sm text-white/60">読み込み中...</p>
        ) : photos.length === 0 ? (
          <p className="mt-16 text-center text-sm text-white/60">まだ撮影がありません</p>
        ) : (
          <ul className="grid grid-cols-3 gap-1">
            {photos.map((p) => (
              <li key={p.id} className="aspect-square overflow-hidden bg-white/5">
                <Thumbnail
                  blob={p.blob}
                  onClick={() => onOpenPhoto(p.id)}
                  className="h-full w-full"
                  alt={new Date(p.takenAt).toLocaleString('ja-JP')}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
