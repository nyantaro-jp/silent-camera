import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraView } from '../components/CameraView';
import { Controls } from '../components/Controls';
import { startCamera, stopStream } from '../lib/camera';
import { captureFrame } from '../lib/capture';
import { getLatestPhoto, savePhoto } from '../lib/storage';

type CamState = 'idle' | 'starting' | 'running' | 'denied' | 'error';

export function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<CamState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [flashing, setFlashing] = useState(false);
  const [latestThumb, setLatestThumb] = useState<string | null>(null);

  // 直近サムネのロード(IndexedDB から)
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

  const start = useCallback(async () => {
    setState('starting');
    setErrorMsg(null);
    try {
      const stream = await startCamera({ facing: 'environment' });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {
          /* iOS Safari では muted+playsinline でほぼ play できる */
        });
      }
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
  }, []);

  // アンマウント時にストリーム停止
  useEffect(() => {
    return () => {
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  const onShutter = useCallback(async () => {
    const video = videoRef.current;
    if (!video || state !== 'running') return;
    try {
      // 視覚フィードバック(白フラッシュ)
      setFlashing(true);
      window.setTimeout(() => setFlashing(false), 120);

      const result = await captureFrame(video, { type: 'image/jpeg', quality: 0.95 });
      await savePhoto(result);

      // サムネ更新
      if (latestThumb) URL.revokeObjectURL(latestThumb);
      setLatestThumb(URL.createObjectURL(result.blob));
    } catch (e) {
      setErrorMsg((e as Error).message);
    }
  }, [state, latestThumb]);

  return (
    <div className="relative h-full w-full bg-black text-white">
      {state === 'running' && <CameraView ref={videoRef} />}

      {state === 'idle' && (
        <StartScreen onStart={start} title="無音カメラ" subtitle="タップしてカメラを開始" />
      )}
      {state === 'starting' && <CenterMessage text="カメラを起動中..." />}
      {state === 'denied' && (
        <StartScreen
          onStart={start}
          title="カメラ権限が必要です"
          subtitle="設定アプリで Safari のカメラ権限を許可してから再試行してください"
          buttonLabel="再試行"
        />
      )}
      {state === 'error' && (
        <StartScreen
          onStart={start}
          title="エラー"
          subtitle={errorMsg ?? '不明なエラー'}
          buttonLabel="再試行"
        />
      )}

      {state === 'running' && (
        <Controls onShutter={onShutter} thumbnailUrl={latestThumb} disabled={flashing} />
      )}

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
