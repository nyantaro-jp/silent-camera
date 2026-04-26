import type { AppSettings, Resolution, TimerSec } from '../lib/settings';

interface TopBarProps {
  settings: AppSettings;
  onChange: (next: Partial<AppSettings>) => void;
  torchSupported: boolean;
  torchOn: boolean;
  onToggleTorch: () => void;
}

const TIMER_CYCLE: Record<TimerSec, TimerSec> = { 0: 3, 3: 10, 10: 0 };
const RES_CYCLE: Record<Resolution, Resolution> = {
  high: 'medium',
  medium: 'low',
  low: 'high',
};
const RES_LABEL: Record<Resolution, string> = { high: '高', medium: '中', low: '低' };

export function TopBar({
  settings,
  onChange,
  torchSupported,
  torchOn,
  onToggleTorch,
}: TopBarProps) {
  return (
    <div
      className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 px-4"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 8px)',
        paddingBottom: '12px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0))',
      }}
    >
      <Pill
        label={
          torchSupported
            ? torchOn
              ? 'ライト ON'
              : 'ライト'
            : settings.screenLightEnabled
              ? '画面光 ON'
              : '画面光'
        }
        active={torchSupported ? torchOn : settings.screenLightEnabled}
        onClick={() => {
          if (torchSupported) onToggleTorch();
          else onChange({ screenLightEnabled: !settings.screenLightEnabled });
        }}
      />

      <Pill
        label={settings.timerSec === 0 ? 'タイマー' : `${settings.timerSec}s`}
        active={settings.timerSec !== 0}
        onClick={() => onChange({ timerSec: TIMER_CYCLE[settings.timerSec] })}
      />

      <Pill
        label="グリッド"
        active={settings.gridEnabled}
        onClick={() => onChange({ gridEnabled: !settings.gridEnabled })}
      />

      <Pill
        label={`解像度 ${RES_LABEL[settings.resolution]}`}
        active={settings.resolution !== 'high'}
        onClick={() => onChange({ resolution: RES_CYCLE[settings.resolution] })}
      />

      <Pill
        label="フラッシュ"
        active={settings.flashScreenEnabled}
        onClick={() => onChange({ flashScreenEnabled: !settings.flashScreenEnabled })}
      />
    </div>
  );
}

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold backdrop-blur active:scale-95 ' +
        (active
          ? 'bg-amber-400 text-black'
          : 'bg-black/40 text-white/90 ring-1 ring-white/20')
      }
    >
      {label}
    </button>
  );
}
