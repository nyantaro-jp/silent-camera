import type { CaptureMode } from '../lib/settings';

interface ControlsProps {
  onShutter: () => void;
  thumbnailUrl: string | null;
  onOpenHistory?: () => void;
  onFlipCamera?: () => void;
  flipDisabled?: boolean;
  disabled?: boolean;
  mode: CaptureMode;
  recording: boolean;
}

/**
 * 下部コントロールバー。
 * 左: 直近撮影サムネ → 履歴画面へ
 * 中央: シャッター (写真=白丸 / 動画=赤丸 / 録画中=赤角丸)
 * 右: 前後カメラ切替
 * 録画中は履歴・切替を無効化する (ストリームが死ぬと録画も止まるため)。
 */
export function Controls({
  onShutter,
  thumbnailUrl,
  onOpenHistory,
  onFlipCamera,
  flipDisabled,
  disabled,
  mode,
  recording,
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
        disabled={recording}
        className="h-14 w-14 overflow-hidden rounded-md border border-white/40 bg-black/40 disabled:opacity-40"
      >
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="直近の撮影" className="h-full w-full object-cover" />
        ) : (
          <span className="block h-full w-full" />
        )}
      </button>

      <button
        type="button"
        aria-label={mode === 'video' ? (recording ? '録画停止' : '録画開始') : 'シャッター'}
        onClick={onShutter}
        disabled={disabled}
        className="h-20 w-20 rounded-full border-4 border-white p-1 active:scale-95 disabled:opacity-40"
      >
        {mode === 'photo' ? (
          <span className="block h-full w-full rounded-full bg-white" />
        ) : recording ? (
          // 録画中: 赤い角丸四角 (iOS 標準カメラ風の停止表示)
          <span className="mx-auto my-auto flex h-full w-full items-center justify-center">
            <span className="block h-8 w-8 rounded-md bg-red-500 transition-all" />
          </span>
        ) : (
          <span className="block h-full w-full rounded-full bg-red-500 transition-all" />
        )}
      </button>

      <button
        type="button"
        aria-label="カメラ切替"
        onClick={onFlipCamera}
        disabled={flipDisabled || recording}
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
