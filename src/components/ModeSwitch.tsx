import type { CaptureMode } from '../lib/settings';

interface Props {
  mode: CaptureMode;
  onChange: (next: CaptureMode) => void;
  /** MediaRecorder 未対応端末では「動画」を出さない */
  videoSupported: boolean;
}

/**
 * 写真 / 動画 のモード切替。シャッターの上に置く iOS 標準カメラ風のトグル。
 */
export function ModeSwitch({ mode, onChange, videoSupported }: Props) {
  if (!videoSupported) return null;

  return (
    <div
      className="absolute inset-x-0 z-10 flex justify-center"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 128px)' }}
    >
      <div className="flex gap-1 rounded-full bg-black/40 p-1 ring-1 ring-white/15 backdrop-blur">
        <ModeButton label="写真" active={mode === 'photo'} onClick={() => onChange('photo')} />
        <ModeButton label="動画" active={mode === 'video'} onClick={() => onChange('video')} />
      </div>
    </div>
  );
}

function ModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-full px-4 py-1 text-xs font-semibold transition-colors ' +
        (active ? 'bg-amber-400 text-black' : 'text-white/80')
      }
    >
      {label}
    </button>
  );
}
