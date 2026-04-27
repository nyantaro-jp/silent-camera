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

function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

/**
 * ホーム画面に追加するためのモーダル。
 * - すでに standalone なら出さない
 * - 一度閉じたら 7 日間出さない
 * - iOS Safari: beforeinstallprompt が無いので手動手順を表示
 * - Android Chrome 等: beforeinstallprompt をリッスンして「インストール」ボタンを出す
 * - Android Chrome がイベントを発火しない場合(条件未達等)は手動メニュー手順を案内
 */
export function InstallGuide() {
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < RESHOW_AFTER_DAYS * 86400000) return;

    // iOS は beforeinstallprompt がないので即時表示
    if (isIOS()) {
      setVisible(true);
      return;
    }

    // Android / その他: イベントを待ち、来たらモーダル + ボタン表示。
    // 30 秒経ってもイベントが来なければ手動案内モーダルを開く。
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    const fallbackTimer = window.setTimeout(() => {
      // すでに表示済み or イベント受信済みなら何もしない
      setVisible((prev) => prev || true);
    }, 30000);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  if (!visible) return null;

  const ios = isIOS();
  const android = isAndroid();

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const installNow = async () => {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setVisible(false);
      }
    } finally {
      // prompt() は 1 度しか呼べない
      setInstallEvent(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center">
      <div
        className="w-full max-w-md rounded-t-2xl bg-zinc-900 p-6 text-white sm:rounded-2xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
      >
        <h2 className="text-lg font-bold">ホーム画面に追加</h2>
        <p className="mt-2 text-sm text-white/70">
          アプリのように使うにはホーム画面に追加してください。standalone モードで起動するとブラウザの UI が消えてフルスクリーンになります。
        </p>

        {ios ? (
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-white/90">
            <li>Safari 下部の共有ボタン(□に↑)をタップ</li>
            <li>「ホーム画面に追加」を選ぶ</li>
            <li>右上の「追加」をタップ</li>
          </ol>
        ) : installEvent ? (
          <p className="mt-4 text-sm text-white/90">
            下のボタンからアプリとしてインストールできます。
          </p>
        ) : android ? (
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-white/90">
            <li>Chrome 右上の ⋮ メニューをタップ</li>
            <li>「アプリをインストール」または「ホーム画面に追加」を選ぶ</li>
          </ol>
        ) : (
          <p className="mt-4 text-sm text-white/90">
            お使いのブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選んでください。
          </p>
        )}

        <div className="mt-6 flex gap-2">
          {installEvent && (
            <button
              type="button"
              onClick={installNow}
              className="flex-1 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black active:scale-95"
            >
              インストール
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className={
              installEvent
                ? 'flex-1 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20'
                : 'flex-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black'
            }
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
