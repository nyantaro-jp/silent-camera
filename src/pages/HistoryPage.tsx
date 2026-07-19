import { useEffect, useState } from 'react';
import { Thumbnail } from '../components/Thumbnail';
import { listMedia, estimateUsageBytes, type MediaRecord } from '../lib/storage';
import { formatDuration } from '../lib/recorder';

interface Props {
  onClose: () => void;
  onOpenPhoto: (id: number) => void;
  refreshKey?: number;
}

const WARN_BYTES = 50 * 1024 * 1024;

export function HistoryPage({ onClose, onOpenPhoto, refreshKey }: Props) {
  const [items, setItems] = useState<MediaRecord[]>([]);
  const [usage, setUsage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [list, used] = await Promise.all([listMedia(), estimateUsageBytes()]);
      if (cancelled) return;
      setItems(list);
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
        ) : items.length === 0 ? (
          <p className="mt-16 text-center text-sm text-white/60">まだ撮影がありません</p>
        ) : (
          <ul className="grid grid-cols-3 gap-1">
            {items.map((m) => (
              <li key={m.id} className="relative aspect-square overflow-hidden bg-white/5">
                <Thumbnail
                  // 動画 Blob は <img> に流せないので poster (録画開始フレーム) を使う
                  blob={m.kind === 'video' && m.poster ? m.poster : m.blob}
                  onClick={() => onOpenPhoto(m.id)}
                  className="h-full w-full"
                  alt={new Date(m.takenAt).toLocaleString('ja-JP')}
                />
                {m.kind === 'video' && (
                  <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] tabular-nums">
                    ▶ {formatDuration(m.durationMs ?? 0)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
