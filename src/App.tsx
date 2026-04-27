import { useCallback, useEffect, useState } from 'react';
import { CameraPage } from './pages/CameraPage';
import { HistoryPage } from './pages/HistoryPage';
import { PhotoDetailPage } from './pages/PhotoDetailPage';
import { InstallGuide } from './components/InstallGuide';
import { InAppBrowserGuide } from './components/InAppBrowserGuide';

type Route =
  | { kind: 'camera' }
  | { kind: 'history' }
  | { kind: 'detail'; photoId: number };

const INITIAL_ROUTE: Route = { kind: 'camera' };

export default function App() {
  const [route, setRoute] = useState<Route>(INITIAL_ROUTE);
  // 履歴一覧の再読み込み用カウンタ
  const [refreshKey, setRefreshKey] = useState(0);

  // 初回マウント時に history の最初のエントリを camera に固定。
  // これで Android の戻るボタンを押した時 popstate で kind:'camera' に戻れる。
  useEffect(() => {
    window.history.replaceState(INITIAL_ROUTE, '');
  }, []);

  // 戻るボタン (Android のシステム戻る、ブラウザの戻る、iOS のスワイプ戻る) と同期
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const next = (e.state as Route | null) ?? INITIAL_ROUTE;
      setRoute(next);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((next: Route) => {
    window.history.pushState(next, '');
    setRoute(next);
  }, []);

  const goBack = useCallback(() => {
    window.history.back();
    // popstate ハンドラが setRoute する
  }, []);

  const onPhotoSaved = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <>
      {route.kind === 'camera' && (
        <CameraPage
          onOpenHistory={() => navigate({ kind: 'history' })}
          onPhotoSaved={onPhotoSaved}
        />
      )}

      {route.kind === 'history' && (
        <HistoryPage
          onClose={goBack}
          onOpenPhoto={(id) => navigate({ kind: 'detail', photoId: id })}
          refreshKey={refreshKey}
        />
      )}

      {route.kind === 'detail' && (
        <PhotoDetailPage
          photoId={route.photoId}
          onClose={goBack}
          onDeleted={() => {
            setRefreshKey((k) => k + 1);
            goBack();
          }}
        />
      )}

      <InstallGuide />
      {/* 最後に置くことで z-index 関係なく一番上に重なる */}
      <InAppBrowserGuide />
    </>
  );
}
