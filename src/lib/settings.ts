// アプリ全体の設定。撮影セッションをまたいで保持したい値だけここに置く。
// IndexedDB ではなく localStorage を使う(同期 API + 容量も足りる)。

export type Resolution = 'high' | 'medium' | 'low';
export type TimerSec = 0 | 3 | 10;
export type CaptureMode = 'photo' | 'video';

export interface AppSettings {
  gridEnabled: boolean;
  timerSec: TimerSec;
  resolution: Resolution;
  /** 撮影瞬間の白フラッシュ視覚フィードバック ON/OFF */
  flashScreenEnabled: boolean;
  /** 暗所撮影用に撮影直前に画面を白くして照明として使う(トーチ非対応端末向け) */
  screenLightEnabled: boolean;
  /** 写真 / 動画 の撮影モード。iOS 標準カメラ同様、前回のモードを記憶する */
  captureMode: CaptureMode;
}

export const DEFAULT_SETTINGS: AppSettings = {
  gridEnabled: false,
  timerSec: 0,
  resolution: 'high',
  flashScreenEnabled: true,
  screenLightEnabled: false,
  captureMode: 'photo',
};

const KEY = 'silent-camera:settings';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: AppSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // private mode 等。失敗しても致命ではない。
  }
}
