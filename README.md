# Silent Camera

シャッター音の鳴らないカメラ PWA。iOS Safari で `getUserMedia` 経由のため、日本版 iOS 標準カメラの音声強制を回避できる。

## ステータス

Step 1〜3 完了:

- カメラプレビュー(背面カメラ)
- シャッターボタンによる無音撮影 (Canvas → JPEG Blob)
- IndexedDB への保存 + 直近サムネ表示
- 撮影時の白フラッシュ視覚フィードバック

未実装(後続 Step):

- 前後カメラ切替 / ズーム / トーチ / タイマー / グリッド
- 履歴一覧画面・共有・削除
- ホーム画面追加ガイド
- 解像度設定

## 必要環境

- Node.js 20+
- iPhone (iOS Safari) で実機確認
- HTTPS 環境(GitHub Pages なら自動)

## セットアップ

```bash
npm install
npm run dev      # http://localhost:5173 — PC ブラウザでは UI 確認のみ
npm run build    # アイコン生成 + 型チェック + プロダクションビルド
```

## ローカルで iPhone 実機確認する方法

`getUserMedia` は HTTPS 必須。localhost なら HTTP でも動くが、iPhone から LAN 越しに見るときは HTTPS が要る。

### 方法 A: mkcert + LAN

```bash
brew install mkcert            # macOS。Windows は scoop install mkcert
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

iPhone から `https://192.168.x.x:5173/silent-camera/` にアクセス。

### 方法 B: ngrok 等のトンネル

```bash
npx ngrok http 5173
```

発行された HTTPS URL に iPhone でアクセス。

### 方法 C: GitHub Pages 経由(推奨・最初はこれ)

`main` に push すれば GitHub Actions が自動でビルド & デプロイ。数分で
`https://<your-user>.github.io/silent-camera/` で見られる。

## GitHub Pages 公開手順

1. GitHub で **Public** リポジトリを `silent-camera` という名前で作成
2. ローカルで初コミット → push:
   ```bash
   git init
   git add .
   git commit -m "initial commit (Step 1-3 silent camera)"
   git branch -M main
   git remote add origin https://github.com/<your-user>/silent-camera.git
   git push -u origin main
   ```
3. GitHub の **Settings → Pages → Build and deployment → Source** を `GitHub Actions` に変更
4. **Actions** タブで初回ワークフローの完了を待つ
5. 表示された URL を iPhone Safari で開く

リポジトリ名を `silent-camera` 以外にする場合は `vite.config.ts` の `base` も合わせて変更すること。

## iPhone で「ホーム画面に追加」する手順

1. Safari で公開 URL を開く
2. 共有ボタン(□に↑) → 「ホーム画面に追加」
3. ホーム画面のアイコンから起動するとフルスクリーン (standalone) で動く

## 動作確認チェックリスト (Step 3 時点)

- [ ] iPhone Safari でアクセスできる
- [ ] 「カメラを開始」をタップして権限を許可するとプレビューが映る
- [ ] **シャッターを押しても音が鳴らない**(静かな部屋で要確認)
- [ ] 撮影後に左下サムネが直近画像に更新される
- [ ] アプリを閉じて再起動してもサムネが残っている (IndexedDB 永続化)

## ファイル構成

```
silent-camera/
  index.html
  vite.config.ts
  scripts/gen-icons.mjs       SVG → PNG (192/512) 生成
  public/
    camera-icon.svg           マスターアイコン (黒地+白カメラ)
    icon-192.png, icon-512.png, apple-touch-icon.png  build 時に生成
    favicon.svg
  src/
    main.tsx
    App.tsx
    pages/CameraPage.tsx      メイン画面
    components/
      CameraView.tsx          <video> ラッパー (playsinline + muted)
      Controls.tsx            下部コントロールバー
    lib/
      camera.ts               getUserMedia ラッパー
      capture.ts              Canvas → Blob
      storage.ts              IndexedDB (idb)
    styles/globals.css
```

## 既知のリスク

- iOS Safari は `MediaTrackConstraints.torch` 未対応 → ライト機能は画面フラッシュで代替予定 (Step 6)
- `beforeinstallprompt` 非対応 → ホーム画面追加は手動ガイドのみ

詳細な開発メモは [NOTES.md](./NOTES.md) を参照。
