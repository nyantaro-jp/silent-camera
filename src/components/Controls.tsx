interface ControlsProps {
  onShutter: () => void;
  thumbnailUrl: string | null;
  onOpenHistory?: () => void;
  onFlipCamera?: () => void;
  flipDisabled?: boolean;
  disabled?: boolean;
}

/**
 * 下部コントロールバー。
 * 左: 直近撮影サムネ → 履歴画面へ
 * 中央: シャッター
 * 右: 前後カメラ切替
 */
export function Controls({
  onShutter,
  thumbnailUrl,
  onOpenHistory,
  onFlipCamera,
  flipDisabled,
  disabled,
}: ControlsProps) {
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

      <button
        type="button"
        aria-label="カメラ切替"
        onClick={onFlipCamera}
        disabled={flipDisabled}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-black/40 text-white active:scale-95 disabled:opacity-40"
      >
        <FlipIcon />
      </button>
    </div>
  );
}

function FlipIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5V3L8 7l4 4V9a6 6 0 0 1 6 6 6 6 0 0 1-1 3" />
      <path d="M12 19v2l4-4-4-4v2a6 6 0 0 1-6-6 6 6 0 0 1 1-3" />
    </svg>
  );
}
