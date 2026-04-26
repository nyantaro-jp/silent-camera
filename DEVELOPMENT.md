# 開発者向けドキュメント

開発手順、ローカル iPhone 実機確認、デプロイ周りをまとめる。エンドユーザー向けの情報は [README.md](./README.md)、ハマりどころメモは [NOTES.md](./NOTES.md) を参照。

## 必要環境

- Node.js 20+
- npm 10+
- (任意) iPhone (iOS 15+ 推奨、写真アプリへ保存に Web Share API files を使うため)

## セットアップ

```bash
git clone https://github.com/nyantaro-jp/silent-camera.git
cd silent-camera
npm install
```

## スクリプト

| コマンド | 用途 |
|---|---|
| `npm run dev` | Vite 開発サーバ起動 (`http://localhost:5173/silent-camera/`) |
| `npm run build` | アイコン PNG 生成 → `tsc -b` 型チェック → Vite 本番ビルド |
| `npm run gen:icons` | `public/camera-icon.svg` から 192/512/apple-touch PNG を再生成 |
| `npm run preview` | ビルド後の `dist/` をローカルで配信 |
| `npm run lint` | ESLint |

## ローカルで iPhone 実機を繋ぐ方法

`getUserMedia` は HTTPS 必須。`localhost` なら HTTP でも動くが、iPhone から PC の LAN 越しに見るときは HTTPS が要る。

### 方法 A — mkcert で LAN 用 HTTPS を立てる

```bash
# Windows
scoop install mkcert
# macOS
brew install mkcert

mkcert -install
mkcert localhost 192.168.x.x   # PC の LAN 内 IP
```

`vite.config.ts` の `server` を以下のように差し替え:

```ts
import fs from 'node:fs';
// ...
server: {
  host: true,
  https: {
    key: fs.readFileSync('./localhost+1-key.pem'),
    cert: fs.readFileSync('./localhost+1.pem'),
  },
}
```

iPhone Safari から `https://192.168.x.x:5173/silent-camera/` にアクセス。証明書を端末に信頼させる必要があるので `mkcert -CAROOT` の rootCA を AirDrop 等で iPhone に送ってインストール → 設定 → 一般 → 情報 → 証明書信頼設定。

### 方法 B — ngrok 等のトンネル

```bash
npx ngrok http 5173
```

発行された HTTPS URL の末尾に `/silent-camera/` を付けて iPhone Safari で開く。

### 方法 C — 直接 GitHub Pages にデプロイして確認 (おすすめ)

`main` に push すれば数分で反映される。素早く実機で確認できるので、最初はこれで十分。

## GitHub Pages デプロイ

`.github/workflows/deploy.yml` が `main` への push と手動トリガーで動く。

初回設定:

1. GitHub リポジトリ **Settings → Pages → Build and deployment → Source** を `GitHub Actions` に設定
2. リポジトリは Public にする(無料プランの GitHub Pages は Public のみ)

リポジトリ名を `silent-camera` 以外に変える場合は `vite.config.ts` の `base: '/silent-camera/'` も合わせて変更。

## ファイル構成

```
silent-camera/
  index.html                  iOS meta tag (apple-mobile-web-app-*) + viewport-fit=cover
  vite.config.ts              base: '/silent-camera/' + vite-plugin-pwa
  scripts/gen-icons.mjs       SVG → PNG 192/512 の build 時生成
  .github/workflows/deploy.yml  GitHub Pages auto deploy

  public/
    camera-icon.svg           マスターアイコン (黒地+白カメラ)
    icon-192.png              build 時に gen:icons が生成
    icon-512.png
    apple-touch-icon.png
    favicon.svg

  src/
    main.tsx                  エントリ
    App.tsx                   軽量ルーティング (camera ⇄ history ⇄ detail)
    pages/
      CameraPage.tsx          メイン撮影画面 (全機能の統合)
      HistoryPage.tsx         撮影履歴サムネ一覧
      PhotoDetailPage.tsx     拡大表示 + 共有 + 削除
    components/
      CameraView.tsx          <video> ラッパー (playsInline + muted)
      Controls.tsx            下部バー (サムネ / シャッター / 切替)
      TopBar.tsx              上部設定ピル (ライト / タイマー / グリッド / 解像度 / フラッシュ)
      Grid.tsx                三分割線オーバーレイ
      CountdownOverlay.tsx    タイマー撮影のカウントダウン表示
      ZoomControl.tsx         1x/2x/5x クイック + スライダー
      Thumbnail.tsx           Blob → ObjectURL の <img>
      InstallGuide.tsx        iOS 用 A2HS 案内モーダル
    lib/
      camera.ts               getUserMedia + zoom/torch/解像度/前後切替
      capture.ts              <video> → Canvas → JPEG Blob
      storage.ts              IndexedDB (idb) 写真の保存/取得/削除
      share.ts                Web Share API + ダウンロードフォールバック
      wakelock.ts             Screen Wake Lock + visibilitychange 再取得
      settings.ts             localStorage に永続化する設定
    types/
      media.d.ts              MediaTrack* に zoom/torch を追加宣言
    styles/
      globals.css             Tailwind base + 撮影フラッシュアニメーション
```

## アイコンの差し替え方

`public/camera-icon.svg` を編集 → `npm run gen:icons` で 192/512/apple-touch-icon を再生成。`npm run build` でも自動的に走る。

## ビルド検証

PR を出す前に最低限以下を実行:

```bash
npm run build      # gen:icons → tsc -b → vite build を一気通貫
npm run lint
```

`tsc -b` で型エラーが出たら ESLint より先に直す。`MediaTrackCapabilities.zoom` のような型不整合は `src/types/media.d.ts` を確認。

## 既知のリスク・トレードオフ

- **iOS Safari は `MediaTrackConstraintSet.torch` を未実装** — 検出して画面光フォールバックに切替済み
- **iOS Safari は `beforeinstallprompt` 未実装** — `InstallGuide.tsx` で手動案内
- **Wake Lock は iOS 16.4+** — それ以下は素通し(失敗を握りつぶす)
- **画質はネイティブ AVFoundation より若干劣る** — Canvas 経由なので Bayer 等のセンサー直結処理は使えない
- **写真アプリへの直接保存は不可** — Web Share API のシェアシート経由(タップ 1 回挟まる)。これは iOS の制約で回避不能
- **GitHub Pages の base path** — `vite.config.ts` の `base` とリポジトリ名を一致させること

## 詳細メモ

ハマりどころと判断の根拠は [NOTES.md](./NOTES.md) に蓄積していく。
