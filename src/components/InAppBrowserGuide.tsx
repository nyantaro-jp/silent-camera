import { useEffect, useState } from 'react';

// 主要 SNS / メッセンジャー の WebView を UA で検出する。
// それぞれの公式アプリが内部ブラウザで使う識別子。
const APP_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'Discord', re: /Discord/i },
  { name: 'Instagram', re: /Instagram/i },
  { name: 'Facebook', re: /FBAN|FBAV|FB_IAB|FB4A/i },
  { name: 'X (Twitter)', re: /TwitterAndroid|Twitter for/i },
  { name: 'LINE', re: /\bLine\//i },
  { name: 'WeChat', re: /MicroMessenger/i },
  { name: 'Snapchat', re: /Snapchat/i },
  { name: 'TikTok', re: /BytedanceWebview|musical_ly/i },
  { name: 'Slack', re: /Slack/i },
  { name: 'KakaoTalk', re: /KAKAOTALK/i },
];

function detectInAppBrowser(): string | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  for (const p of APP_PATTERNS) {
    if (p.re.test(ua)) return p.name;
  }
  return null;
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * SNS 等の組み込みブラウザ (WebView) で開かれた時に、外部ブラウザで開くよう案内するモーダル。
 * 多くの WebView は getUserMedia の権限ダイアログを出さない / そもそもカメラが使えないため、
 * 何もしないと「カメラを開始」を押しても権限ダイアログが出ない詰み状態になる。
 *
 * 「無視」を押した場合は同セッション中は再表示しない (それでも進めば動かないが、
 * 既に把握しているユーザーがブロックされないように)。
 */
export function InAppBrowserGuide() {
  const [appName, setAppName] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setAppName(detectInAppBrowser());
  }, []);

  if (!appName || dismissed) return null;

  const ios = isIOS();
  const url = window.location.href;

  const copyUrl = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // フォールバック (古い WebView で navigator.clipboard が無い場合)
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/85 sm:items-center">
      <div
        className="w-full max-w-md rounded-t-2xl bg-zinc-900 p-6 text-white sm:rounded-2xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
      >
        <h2 className="text-lg font-bold">{appName} の内部ブラウザでは動きません</h2>
        <p className="mt-2 text-sm text-white/70">
          {appName} のアプリ内ブラウザはカメラ機能 (getUserMedia) に対応していません。
          {ios ? 'Safari' : 'Chrome / Opera / Firefox 等'}
          で開き直してください。
        </p>

        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-white/90">
          <li>画面右上の「⋮」または「・・・」メニューをタップ</li>
          <li>{ios ? '「Safari で開く」' : '「ブラウザで開く」または「外部ブラウザで開く」'}を選ぶ</li>
        </ol>

        <p className="mt-4 rounded-md bg-white/5 p-3 text-xs text-white/70 ring-1 ring-white/10">
          メニューに該当項目が無い場合は、下の「URL をコピー」を押して
          {ios ? ' Safari' : ' Chrome 等'} を起動 → アドレスバーに貼り付けてください。
        </p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={copyUrl}
            className="flex-1 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black active:scale-95"
          >
            {copied ? '✓ コピーしました' : 'URL をコピー'}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20"
          >
            無視
          </button>
        </div>
      </div>
    </div>
  );
}
