// Screen Wake Lock。撮影画面を開いている間は画面オフを抑止する。
// iOS は 16.4+ で対応。未対応ブラウザでは黙ってスキップ。

let sentinel: WakeLockSentinel | null = null;

async function acquire(): Promise<void> {
  if (!('wakeLock' in navigator)) return;
  if (sentinel) return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
    });
  } catch (e) {
    // 権限不足やバックグラウンド時は失敗するが致命ではない
    console.warn('wakeLock.request failed:', e);
  }
}

async function release(): Promise<void> {
  if (!sentinel) return;
  try {
    await sentinel.release();
  } catch {
    /* noop */
  } finally {
    sentinel = null;
  }
}

/**
 * 画面表示中だけ Wake Lock を取り続ける。
 * visibility 変更時に再取得が必要なため、ハンドラも一緒にセットする。
 * 返り値の関数を呼ぶと完全に解除する。
 */
export function startWakeLock(): () => Promise<void> {
  let active = true;
  void acquire();

  const onVisibility = () => {
    if (!active) return;
    if (document.visibilityState === 'visible') {
      void acquire();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  return async () => {
    active = false;
    document.removeEventListener('visibilitychange', onVisibility);
    await release();
  };
}
