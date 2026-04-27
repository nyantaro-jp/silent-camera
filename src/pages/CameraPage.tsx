import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraView } from '../components/CameraView';
import { Controls } from '../components/Controls';
import { TopBar } from '../components/TopBar';
import { Grid } from '../components/Grid';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { ZoomControl } from '../components/ZoomControl';
import {
  applyZoom,
  flipFacing,
  getZoomCapability,
  hasMultipleCameras,
  isTorchSupported,
  setTorch,
  startCamera,
  stopStream,
  type Facing,
  type ZoomCapability,
} from '../lib/camera';
import { captureFrame } from '../lib/capture';
import { getLatestPhoto, savePhoto } from '../lib/storage';
import { loadSettings, saveSettings, type AppSettings } from '../lib/settings';
import { startWakeLock } from '../lib/wakelock';

type CamState = 'idle' | 'starting' | 'running' | 'denied' | 'error';

interface Props {
  onOpenHistory: () => void;
  onPhotoSaved: () => void;
}

export function CameraPage({ onOpenHistory, onPhotoSaved }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>('environment');
  const [state, setState] = useState<CamState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [settings, setSettingsState] = useState<AppSettings>(() => loadSettings());
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const [flashing, setFlashing] = useState(false);
  const [screenLightOn, setScreenLightOn] = useState(false);
  const [latestThumb, setLatestThumb] = useState<string | null>(null);

  const [zoomCap, setZoomCap] = useState<ZoomCapability | null>(null);
  const [zoomValue, setZoomValue] = useState<number>(1);

  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const [multipleCameras, setMultipleCameras] = useState(false);

  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

  // ---------- 起動 ----------
  const start = useCallback(
    async (nextFacing: Facing = facing) => {
      setState('starting');
      setErrorMsg(null);
      try {
        const newStream = await startCamera({
          facing: nextFacing,
          resolution: settings.resolution,
        });
        setFacing(nextFacing);
        setStream(newStream);
        setState('running');
      } catch (e) {
        const err = e as DOMException;
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
          setState('denied');
        } else {
          setState('error');
          setErrorMsg(err.message || String(e));
        }
      }
    },
    [facing, settings.resolution],
  );

  // 解像度変更時はストリームを張り直す
  const lastResRef = useRef(settings.resolution);
  useEffect(() => {
    if (state !== 'running') {
      lastResRef.current = settings.resolution;
      return;
    }
    if (lastResRef.current === settings.resolution) return;
    lastResRef.current = settings.resolution;
    void start(facing);
  }, [settings.resolution, state, facing, start]);

  // 直近サムネのロード
  useEffect(() => {
    let revoked: string | null = null;
    (async () => {
      const latest = await getLatestPhoto();
      if (latest) {
        const url = URL.createObjectURL(latest.blob);
        setLatestThumb(url);
        revoked = url;
      }
    })();
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, []);

  // stream を <video> に attach + ズーム/トーチ capability を読む
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch((err) => console.warn('video.play() rejected:', err));

    const cap = getZoomCapability(stream);
    setZoomCap(cap);
    setZoomValue(cap?.current ?? 1);

    setTorchAvailable(isTorchSupported(stream));
    setTorchOn(false);

    return () => {
      stopStream(stream);
    };
  }, [stream]);

  // 複数カメラ検出 (権限後にもう一度 enumerateDevices で正確になる)
  useEffect(() => {
    if (state !== 'running') return;
    void hasMultipleCameras().then(setMultipleCameras);
  }, [state]);

  // Wake Lock
  useEffect(() => {
    if (state !== 'running') return;
    const stop = startWakeLock();
    return () => {
      void stop();
    };
  }, [state]);

  // アンマウント時にストリーム停止
  useEffect(() => {
    return () => {
      stopStream(stream);
    };
  }, [stream]);

  // ---------- ズーム ----------
  const onZoomChange = useCallback(
    (value: number) => {
      if (!stream || !zoomCap) return;
      const clamped = Math.min(zoomCap.max, Math.max(zoomCap.min, value));
      setZoomValue(clamped);
      void applyZoom(stream, clamped).catch(() => {
        /* 一部端末で稀に失敗するが UI 上は維持 */
      });
    },
    [stream, zoomCap],
  );

  // ピンチジェスチャー
  useEffect(() => {
    if (!zoomCap || state !== 'running') return;
    const el = containerRef.current;
    if (!el) return;

    let startDist = 0;
    let startZoom = zoomValue;

    const dist = (touches: TouchList) => {
      const a = touches[0];
      const b = touches[1];
      return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = dist(e.touches);
        startZoom = zoomValue;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist > 0) {
        e.preventDefault();
        const ratio = dist(e.touches) / startDist;
        onZoomChange(startZoom * ratio);
      }
    };
    el.addEventListener('touchstart', onTouchStart);
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, [zoomCap, zoomValue, state, onZoomChange]);

  // ---------- トーチ ----------
  const onToggleTorch = useCallback(async () => {
    if (!stream || !torchAvailable) return;
    const next = !torchOn;
    try {
      await setTorch(stream, next);
      setTorchOn(next);
    } catch (e) {
      setErrorMsg('トーチを切替できませんでした: ' + (e as Error).message);
    }
  }, [stream, torchAvailable, torchOn]);

  // ---------- 撮影 ----------
  const doCapture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || state !== 'running') return;
    if (!video.videoWidth || !video.videoHeight) {
      setErrorMsg('カメラ映像の準備ができていません');
      return;
    }
    try {
      // 画面光ライト ON 設定 + トーチ未使用なら、撮影直前に画面を白くして照明にする
      const useScreenLight = settings.screenLightEnabled && !torchOn;
      if (useScreenLight) {
        setScreenLightOn(true);
        // ブラウザに白塗りを描画させる時間を確保(2 frame 程度)
        await new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        );
      }

      // フラッシュ視覚フィードバック
      if (settings.flashScreenEnabled) {
        setFlashing(true);
        window.setTimeout(() => setFlashing(false), 120);
      }

      const result = await captureFrame(video, { type: 'image/jpeg', quality: 0.95 });
      await savePhoto(result);

      if (useScreenLight) setScreenLightOn(false);

      // サムネ更新
      setLatestThumb((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(result.blob);
      });
      onPhotoSaved();
    } catch (e) {
      setScreenLightOn(false);
      setErrorMsg((e as Error).message);
    }
  }, [state, settings.flashScreenEnabled, settings.screenLightEnabled, torchOn, onPhotoSaved]);

  const onShutter = useCallback(() => {
    if (state !== 'running') return;
    if (countdown !== null) return; // 二重押し防止
    if (settings.timerSec === 0) {
      void doCapture();
      return;
    }
    let remain = settings.timerSec;
    setCountdown(remain);
    countdownTimerRef.current = window.setInterval(() => {
      remain -= 1;
      if (remain <= 0) {
        if (countdownTimerRef.current !== null) {
          window.clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        setCountdown(null);
        void doCapture();
      } else {
        setCountdown(remain);
      }
    }, 1000);
  }, [state, countdown, settings.timerSec, doCapture]);

  const cancelCountdown = useCallback(() => {
    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  }, []);

  // アンマウント時にタイマー解除
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current !== null) {
        window.clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  // ---------- 前後カメラ切替 ----------
  const onFlipCamera = useCallback(() => {
    if (state !== 'running') return;
    void start(flipFacing(facing));
  }, [state, facing, start]);

  // ---------- レンダー ----------
  const isFront = facing === 'user';
  const showZoom = state === 'running' && zoomCap && countdown === null;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-black text-white">
      {state === 'running' && <CameraView ref={videoRef} mirrored={isFront} />}

      {state === 'idle' && (
        <StartScreen onStart={() => start()} title="無音カメラ" subtitle="タップしてカメラを開始" />
      )}
      {state === 'starting' && <CenterMessage text="カメラを起動中..." />}
      {state === 'denied' && (
        <StartScreen
          onStart={() => start()}
          title="カメラ権限が必要です"
          subtitle={getDeniedHelp()}
          buttonLabel="再試行"
        />
      )}
      {state === 'error' && (
        <StartScreen
          onStart={() => start()}
          title="エラー"
          subtitle={errorMsg ?? '不明なエラー'}
          buttonLabel="再試行"
        />
      )}

      {state === 'running' && (
        <>
          {settings.gridEnabled && <Grid />}

          <TopBar
            settings={settings}
            onChange={updateSettings}
            torchSupported={torchAvailable}
            torchOn={torchOn}
            onToggleTorch={onToggleTorch}
          />

          {showZoom && (
            <ZoomControl capability={zoomCap} value={zoomValue} onChange={onZoomChange} />
          )}

          <Controls
            onShutter={onShutter}
            thumbnailUrl={latestThumb}
            onOpenHistory={onOpenHistory}
            onFlipCamera={onFlipCamera}
            flipDisabled={!multipleCameras}
            disabled={countdown !== null}
          />

          {countdown !== null && (
            <CountdownOverlay seconds={countdown} onCancel={cancelCountdown} />
          )}

          {errorMsg && (
            <div className="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center">
              <p className="rounded-full bg-red-600/90 px-4 py-1 text-xs">{errorMsg}</p>
            </div>
          )}
        </>
      )}

      {/* 撮影直前の画面光(暗所撮影代替) */}
      {screenLightOn && <div className="pointer-events-none fixed inset-0 z-40 bg-white" />}

      {/* 撮影瞬間の白フラッシュ */}
      <div className={`flash-overlay ${flashing ? 'active' : ''}`} aria-hidden />
    </div>
  );
}

function StartScreen({
  onStart,
  title,
  subtitle,
  buttonLabel = 'カメラを開始',
}: {
  onStart: () => void;
  title: string;
  subtitle: string;
  buttonLabel?: string;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-white/70">{subtitle}</p>
      <button
        type="button"
        onClick={onStart}
        className="rounded-full bg-white px-8 py-3 text-base font-semibold text-black active:scale-95"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function CenterMessage({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <p className="text-sm text-white/70">{text}</p>
    </div>
  );
}

/** カメラ権限拒否時の案内文を OS 別に出し分ける。 */
function getDeniedHelp(): string {
  if (typeof navigator === 'undefined') return '';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) {
    return 'iOS 設定 → Safari → カメラ で許可してから再試行してください';
  }
  if (/Android/.test(ua)) {
    return 'アドレスバー左の 🔒 アイコン → 権限 → カメラ を「許可」にしてページを更新してください。または Chrome の ⋮ → 設定 → サイト設定 → カメラ から該当サイトを許可';
  }
  return 'アドレスバー左の鍵アイコンからカメラ権限を許可してから再試行してください';
}
