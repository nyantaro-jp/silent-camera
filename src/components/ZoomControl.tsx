import type { ZoomCapability } from '../lib/camera';

interface Props {
  capability: ZoomCapability;
  value: number;
  onChange: (next: number) => void;
}

/**
 * 1x / 2x / 5x のクイックボタン + スライダー。
 * 1/2/5 のうちデバイスが対応する範囲のものだけ表示する。
 */
export function ZoomControl({ capability, value, onChange }: Props) {
  const presets = [1, 2, 5].filter((p) => p >= capability.min && p <= capability.max);

  const clamp = (v: number) => Math.min(capability.max, Math.max(capability.min, v));

  return (
    <div className="absolute inset-x-0 z-10 flex flex-col items-center gap-2" style={{ bottom: 168 }}>
      <div className="flex gap-2">
        {presets.map((p) => {
          const active = Math.abs(value - p) < 0.05;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onChange(clamp(p))}
              className={
                'rounded-full px-3 py-1 text-xs font-semibold backdrop-blur active:scale-95 ' +
                (active
                  ? 'bg-amber-400 text-black'
                  : 'bg-black/40 text-white/90 ring-1 ring-white/20')
              }
            >
              {p}x
            </button>
          );
        })}
        <span className="rounded-full bg-black/40 px-3 py-1 text-xs text-white/70 ring-1 ring-white/20 tabular-nums">
          {value.toFixed(1)}x
        </span>
      </div>
      <input
        type="range"
        min={capability.min}
        max={capability.max}
        step={capability.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-2/3 max-w-sm accent-amber-400"
      />
    </div>
  );
}
