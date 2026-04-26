import { useEffect, useState } from 'react';

const DISMISS_KEY = 'silent-camera:install-guide-dismissed-at';
const RESHOW_AFTER_DAYS = 7;

interface NavigatorWithStandalone {
  standalone?: boolean;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  const nav = navigator as Navigator & NavigatorWithStandalone;
  return nav.standalone === true;
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * iOS Safari 用「ホーム画面に追加してください」ガイド。
 * - すでに standalone なら出さない
 * - 一度閉じたら 7 日間出さない
 * - iOS 以外でも一応出す(Android Chrome 等は別途 beforeinstallprompt があるが、ここでは案内のみ)
 */
export function InstallGuide() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < RESHOW_AFTER_DAYS * 86400000) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  const ios = isIOS();

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center">
      <div
        className="w-full max-w-md rounded-t-2xl bg-zinc-900 p-6 text-white sm:rounded-2xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
      >
        <h2 className="text-lg font-bold">ホーム画面に追加</h2>
        <p className="mt-2 text-sm text-white/70">
          アプリのように使うにはホーム画面に追加してください。standalone モードで起動すると Safari の
          UI が消えてフルスクリーンになります。
        </p>
        {ios ? (
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-white/90">
            <li>Safari 下部の共有ボタン(□に↑)をタップ</li>
            <li>「ホーム画面に追加」を選ぶ</li>
            <li>右上の「追加」をタップ</li>
          </ol>
        ) : (
          <p className="mt-4 text-sm text-white/90">
            お使いのブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選んでください。
          </p>
        )}
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, String(Date.now()));
              setVisible(false);
            }}
            className="flex-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
