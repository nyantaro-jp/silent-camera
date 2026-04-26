interface ControlsProps {
  onShutter: () => void;
  thumbnailUrl: string | null;
  onOpenHistory?: () => void;
  disabled?: boolean;
}

/**
 * 下部コントロールバー。
 * - 中央: シャッターボタン (iOS 標準カメラ風の二重丸)
 * - 左: 直近撮影サムネイル
 * - 右: (Step 5 でカメラ切替を入れる予定の枠だけ確保)
 */
export function Controls({ onShutter, thumbnailUrl, onOpenHistory, disabled }: ControlsProps) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-8"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
        paddingTop: '16px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0))',
      }}
    >
      <button
        type="button"
        aria-label="撮影履歴"
        onClick={onOpenHistory}
        className="h-14 w-14 overflow-hidden rounded-md border border-white/40 bg-black/40"
      >
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="直近の撮影" className="h-full w-full object-cover" />
        ) : (
          <span className="block h-full w-full" />
        )}
      </button>

      <button
        type="button"
        aria-label="シャッター"
        onClick={onShutter}
        disabled={disabled}
        className="h-20 w-20 rounded-full border-4 border-white p-1 active:scale-95 disabled:opacity-40"
      >
        <span className="block h-full w-full rounded-full bg-white" />
      </button>

      {/* Step 5 で前後切替ボタンに差し替える */}
      <div className="h-14 w-14" aria-hidden />
    </div>
  );
}
