import { useCallback, useState } from 'react';
import { CameraPage } from './pages/CameraPage';
import { HistoryPage } from './pages/HistoryPage';
import { PhotoDetailPage } from './pages/PhotoDetailPage';
import { InstallGuide } from './components/InstallGuide';

type Route =
  | { kind: 'camera' }
  | { kind: 'history' }
  | { kind: 'detail'; photoId: number };

export default function App() {
  const [route, setRoute] = useState<Route>({ kind: 'camera' });
  // 履歴の再読み込み用カウンタ
  const [refreshKey, setRefreshKey] = useState(0);

  const onPhotoSaved = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <>
      {/* CameraPage は常時マウントしておくとカメラ起動の往復が無駄なので、
          履歴 / 詳細を開いている間はオーバーレイで上に被せるだけにする方法もあるが、
          無音カメラの主目的は「撮ったらすぐ写真確認 → 戻ってまた撮る」なので、
          履歴を開く時点で一度ストリームを止める方が省電力でわかりやすい。 */}
      {route.kind === 'camera' && (
        <CameraPage
          onOpenHistory={() => setRoute({ kind: 'history' })}
          onPhotoSaved={onPhotoSaved}
        />
      )}

      {route.kind === 'history' && (
        <HistoryPage
          onClose={() => setRoute({ kind: 'camera' })}
          onOpenPhoto={(id) => setRoute({ kind: 'detail', photoId: id })}
          refreshKey={refreshKey}
        />
      )}

      {route.kind === 'detail' && (
        <PhotoDetailPage
          photoId={route.photoId}
          onClose={() => setRoute({ kind: 'history' })}
          onDeleted={() => {
            setRefreshKey((k) => k + 1);
            setRoute({ kind: 'history' });
          }}
        />
      )}

      <InstallGuide />
    </>
  );
}
