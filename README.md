# Silent Camera

シャッター音を鳴らさずに撮影できる、iPhone 用の Web カメラアプリ (PWA)。

日本で販売される iPhone のカメラアプリは、業界自主規制によりシャッター音を消せない。一方で、ブラウザの `getUserMedia` API はこの制約の対象外。本アプリは Safari 上で動くカメラを `<video>` + `<canvas>` で実装し、画像を完全無音で撮影する。

## デモ

🌐 **[https://nyantaro-jp.github.io/silent-camera/](https://nyantaro-jp.github.io/silent-camera/)**

iPhone Safari で開いてホーム画面に追加すると、ネイティブアプリのようにフルスクリーン起動できる。

<!-- TODO: docs/screenshots/ 以下にスクショを置けば下が表示される -->
<p align="center">
  <img src="docs/screenshots/main.jpg" alt="撮影画面" width="220" />
  <img src="docs/screenshots/history.jpg" alt="履歴画面" width="220" />
  <img src="docs/screenshots/detail.jpg" alt="拡大表示" width="220" />
</p>

## 機能

- **完全無音シャッター** — Audio API 系を一切使わずに撮影
- **前後カメラ切替** — フロント時は左右ミラー
- **ズーム** — ピンチジェスチャー / 1x・2x・5x クイックボタン / スライダー
- **撮影タイマー** — 3秒 / 10秒 + キャンセル可能なカウントダウン
- **グリッド表示** — 三分割線オーバーレイ
- **ライト** — トーチ対応端末は LED、未対応(iOS Safari の大半)は画面光フォールバック
- **解像度切替** — 高 / 中 / 低 (容量節約用)
- **撮影履歴** — 端末内 IndexedDB に保存、サムネ一覧 / 拡大表示 / 削除
- **写真アプリへ保存** — Web Share API (iOS シェアシート → 「画像を保存」)
- **PWA** — ホーム画面追加 / オフライン動作 / 画面スリープ抑止 (Wake Lock)

## iPhone での使い方

1. Safari で上記 URL を開く
2. 「カメラを開始」をタップ → カメラ権限を許可
3. シャッターボタンで撮影 (**音は鳴らない**)
4. ホーム画面に追加: Safari 共有ボタン (□に↑) → 「ホーム画面に追加」
5. 写真アプリに保存: 履歴画面 → 拡大表示 → 「共有 / 写真に保存」 → シェアシートから「画像を保存」

## プライバシー

撮影した画像は **端末内の IndexedDB のみ** に保存され、いかなる外部サーバーにも送信されない。Service Worker のキャッシュ対象もアプリの静的アセット (JS/CSS/SVG/PNG) だけで、撮影画像は含まれない。

通信ログ・アクセス解析・第三者 SDK は一切組み込まれていない。

## 技術スタック

| | 採用理由 |
|---|---|
| **Vite + React + TypeScript** | dev サーバ起動が速く、状態が複数ある UI を型付きで扱う Hook ベースで完結させたかった |
| **Tailwind CSS** | モバイル + ダーク固定の UI なので class 名が肥大化しない範囲で十分。デザイントークン管理も不要 |
| **vite-plugin-pwa** | Workbox ラッパーで SW + manifest を自動生成。`autoUpdate` で更新フローも単純化 |
| **idb (IndexedDB ラッパー)** | 撮影画像 (画像 Blob) は localStorage 上限 5MB を簡単に超えるため、唯一の選択肢 |
| **@resvg/resvg-js** | アイコン PNG を build 時に SVG から生成。Rust 製で軽量、ネイティブビルド不要 |
| **GitHub Actions + GitHub Pages** | 静的サイトなので最小構成。`main` push → 自動デプロイ |

## 設計判断

### 1. 完全無音の保証

`<audio>`、`new Audio()`、Web Audio API、`navigator.vibrate` を**ソースコード全体で 1 箇所も使わない**ことを設計上の制約として置いた。シャッターフィードバックは視覚のみ(撮影瞬間の白フラッシュ + 直近サムネ更新)。

iOS のカメラが音を鳴らせない実装になっているのは AVFoundation 内部の制約。本アプリは `getUserMedia` 経由で MediaStream を取得するためその制約の外側にあり、結果として音を**出すコードが無いから鳴らない**という素直な実装で完全無音が成立する。

### 2. プライバシー重視のクライアント完結

撮影画像は IndexedDB に Blob として保存され、外部送信は一切しない。バックエンドが存在しないため、SQLi / SSRF / セッションハイジャック等のサーバー側リスクが構造的に発生しない。React のデフォルトエスケープに任せ `dangerouslySetInnerHTML` も使わないことで DOM-based XSS も封じている。

### 3. iOS Safari 固有の制約への対処

| 制約 | 対処 |
|---|---|
| `<video>` の自動再生は `playsInline` + `muted` 必須 | JSX で `playsInline autoPlay muted` を確実に付与 |
| `srcObject` を assign する時点で video 要素がマウントされていない | `useEffect([stream])` で attach、CameraView 表示後に確実に走らせる |
| `MediaTrackConstraintSet.torch` 未実装 | `getCapabilities().torch` で判定 → 未対応なら撮影直前に画面全体を白くする「画面光ライト」で代替 |
| `beforeinstallprompt` 未実装 | iOS 検出して、共有ボタンの位置と手順を案内するモーダルを自前で実装 |
| Wake Lock は iOS 16.4+ | `'wakeLock' in navigator` でガード、未対応端末は素通し |

### 4. ストリーム管理の徹底

`getUserMedia` で取得したストリームは、**前後切替 / 解像度変更 / コンポーネントアンマウント時に必ず `track.stop()`** を呼ぶ。これを怠るとカメラが回りっぱなしになりバッテリー消費とインジケーター LED 点灯が止まらない。`useEffect` の cleanup で集中管理している。

### 5. PWA としてのフルスクリーン化

`apple-mobile-web-app-capable` + `viewport-fit=cover` + `env(safe-area-inset-*)` でノッチ対応のフルスクリーン化、`display: standalone` で URL バー非表示、Service Worker でオフライン動作を担保。撮影機能はオフラインでも動く。

## ファイル構成 (概要)

```
src/
  pages/        画面 (CameraPage / HistoryPage / PhotoDetailPage)
  components/   再利用 UI (TopBar / Controls / Grid / ZoomControl 等)
  lib/          ロジック (camera / capture / storage / share / wakelock / settings)
  types/        TypeScript 型拡張 (zoom/torch)
  styles/       Tailwind + 撮影フラッシュアニメ
```

詳細とコンポーネント単位の責務は [DEVELOPMENT.md](./DEVELOPMENT.md) を参照。

## 今後の展望

- [ ] 連写モード (シャッター長押し → 数枚連続)
- [ ] 露出補正 (`MediaTrackConstraintSet.exposureCompensation` を使った露出スライダー)
- [ ] EXIF 情報の付与 (撮影日時はファイル名で対応済みだが、EXIF 自体は未付与)
- [ ] iOS 写真アプリへの自動保存 (現在は Web Share API のタップ 1 回経由)
- [ ] 動画撮影 (MediaRecorder API)

## 開発

開発手順とローカル iPhone 実機確認方法は [DEVELOPMENT.md](./DEVELOPMENT.md)。

開発中の判断記録とハマりどころメモは [NOTES.md](./NOTES.md)。

## ライセンス

[MIT](./LICENSE)
