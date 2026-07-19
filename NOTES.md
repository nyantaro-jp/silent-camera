# 開発メモ

iOS Safari 固有のハマりどころ、判断の根拠などを蓄積するファイル。後続 Step でも追記していく。

## Step 1〜3 で踏んだ・回避した点

### Vite 8 と vite-plugin-pwa の非互換

`npm create vite@latest` で Vite 8 が入ったが、`vite-plugin-pwa@1.2.0` の peerDependencies が `vite ^3 || ^4 || ^5 || ^6 || ^7` までしか宣言していないため `npm install` が ERESOLVE で失敗。Vite 7 にダウングレードして解決。

```bash
npm install -D vite@^7 @vitejs/plugin-react@^4
```

### Tailwind 4 を避けて 3 を入れた

Tailwind 4 系は `@tailwind base;` 構文ではなく `@import "tailwindcss"` ベースに変わり、`tailwindcss init -p` も挙動が違う。指示書のサンプルとの整合と、`vite-plugin-pwa` 周りのトラブルを避けるため Tailwind 3 を明示インストール。

### iOS Safari の `<video>` 注意点

- `playsInline` が無いと全画面動画扱いされる(JSX では `playsInline` キャメルケース)
- `autoplay` を効かせるには `muted` 必須
- `srcObject` に MediaStream を入れた直後の `play()` は Promise を返す。例外が出ても致命ではないので catch して握りつぶしている

### 完全無音の保証

以下を一切使わない方針 (`src/` 全体で grep して見つかれば NG):

- `<audio>` 要素
- `new Audio(...)`
- `AudioContext` / Web Audio API 全般
- `navigator.vibrate`

撮影フィードバックは `flash-overlay` の白フラッシュ + サムネ更新のみ。

### IndexedDB を最初から入れた理由

撮影できても保存先が無いと「撮れた感」が無く、Step 3 の動作確認(再起動後にサムネが残る)もできないため、Step 4 相当の最低限は前倒しで実装した。履歴一覧画面はまだ無いので Step 4 の本実装で UI を追加する。

### GitHub Pages の base パス

`vite.config.ts` の `base: '/silent-camera/'` は **リポジトリ名と完全一致** が必須。
`index.html` から参照するアセットは `./icon-192.png` のように相対 (`./`) で書くこと。
絶対パス `/icon-192.png` だと `https://user.github.io/icon-192.png` を見にいって 404 になる。

### PNG アイコン生成

PWA manifest と `apple-touch-icon` は PNG 必須。`@resvg/resvg-js` を devDependency に入れて、build 時に `scripts/gen-icons.mjs` で SVG → PNG 化する方式にした。
ソース SVG (`public/camera-icon.svg`) を編集すれば次の `npm run build` で自動再生成される。

## 後続 Step での宿題

- **トーチ非対応問題**: `MediaTrackCapabilities` を確認するロジックを `src/lib/camera.ts` に追加し、未対応なら画面フラッシュで代替する
- **Wake Lock**: 撮影画面マウント時に `navigator.wakeLock.request('screen')`、アンマウント時に release
- **権限拒否後の復帰**: iOS Safari は権限を変えるには「設定 → Safari → カメラ」を開く必要があり、ページ内の再リクエストでは復帰しない。エラー画面のメッセージで明示する
- **Web Share API**: `navigator.canShare({ files: [...] })` で対応判定して、不可ならダウンロードリンクへフォールバック

## 動画撮影 (MediaRecorder) 実装メモ

### MIME の分岐

- iOS Safari (14.3+) の MediaRecorder は `video/mp4` で録画する。webm は不可
- Chrome は歴史的に webm が主だが、126 前後から `video/mp4` にも対応
- 実装は `MediaRecorder.isTypeSupported()` を mp4 優先の候補リストで走査。
  mp4 優先の理由: iOS 写真アプリにそのまま保存できる + 再生互換が広い
- `recorder.mimeType` には `;codecs=...` が付くことがあるので、Blob に与える際は
  `split(';')[0]` で素の MIME に落とす (共有時のファイル名拡張子判定を単純にするため)

### 無音の保証は静止画と同じ構図

`getUserMedia({ audio: false })` のストリームをそのまま `MediaRecorder` に渡すため、
動画に音声トラック自体が存在しない。マイク権限も要求しない。
「音を消す」のではなく「音が入る経路が無い」。

### 録画中に禁止すべき操作

ストリームを殺す操作 = 録画も死ぬ操作なので UI で塞ぐ:

- 前後カメラ切替 (stream 再取得) → ボタン disabled
- 解像度変更 (stream 再取得) → TopBar ごと非表示
- 履歴画面への遷移 (CameraPage アンマウント) → サムネボタン disabled

ズームとトーチは `applyConstraints` なのでストリームを維持したまま効く → 録画中も許可。

### サムネイル (poster) は録画開始時に Canvas で確保

動画 Blob は `<img>` に流せないため、履歴一覧のサムネには静止画が要る。
`<video>` に Blob URL を張って seek → Canvas という方法もあるが、iOS Safari の
seek 完了イベントが不安定なので、録画開始直前のフレームを `captureFrame` で
JPEG 化して `poster` として一緒に IndexedDB に保存する方式にした。

### IndexedDB はスキーマレスなので DB バージョン据え置き

`kind` / `durationMs` / `poster` フィールドを追加したが、IndexedDB の object store
はスキーマレスなので `DB_VERSION` を上げる必要は無い (インデックス追加時のみ必要)。
旧レコードには `kind` が無いため、読み出し時に `kind ?? 'photo'` で正規化する。
