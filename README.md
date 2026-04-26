# ぷよぷよ通 初手研究チャート

ぷよぷよ通の初手（オープニング）研究のためのWebツールです。盤面をノード、組ぷよパターンを辺とした有向グラフをグラフィカルに閲覧・編集できます。

## 機能（予定）

- **盤面グラフの可視化**: 空の盤面からスタートし、1手ずつ進めて有向グラフを構築
- **組ぷよ分岐の管理**: 辺に現在の組ぷよ・ネクスト・ネクネクを注釈として設定し、分岐を表現
- **盤面の自動統合**: 同じ盤面に到達した場合は既存ノードへ辺を接続
- **メモ機能**: 各ノードに自由記述テキストのメモを付与
- **データの保存**:
  - ローカルストレージによる一時保存
  - JSON形式でのエクスポート/インポート

## 技術スタック

| カテゴリ       | 技術                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| ビルドツール   | [Vite](https://vite.dev/) 8                                                                            |
| フレームワーク | [React](https://react.dev/) 19 + TypeScript 6                                                          |
| スタイリング   | [TailwindCSS](https://tailwindcss.com/) v4                                                             |
| ユニットテスト | [Vitest](https://vitest.dev/) + Testing Library                                                        |
| E2Eテスト      | [Playwright](https://playwright.dev/)                                                                  |
| リンター       | [ESLint](https://eslint.org/)（型チェック強化）                                                        |
| フォーマッター | [Prettier](https://prettier.io/)                                                                       |
| Gitフック      | [Husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged) |

## セットアップ

### 前提条件

- Node.js 22 以上

### インストール

```bash
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

### ビルド

```bash
npm run build
```

### プレビュー

```bash
npm run preview
```

## テスト

### ユニットテスト

```bash
npm run test          # 1回実行
npm run test:watch    # ウォッチモード
```

### E2Eテスト

```bash
# 初回のみ: Playwrightブラウザのインストール
npx playwright install chromium

# テスト実行
npm run test:e2e
```

## データ形式

グラフデータは以下のようなJSON形式で保存されます（予定）:

```json
{
  "version": 1,
  "nodes": [
    {
      "id": "node-0",
      "board": [[0, 0, 0, 0, 0, 0], "..."],
      "memo": "空盤面"
    }
  ],
  "edges": [
    {
      "id": "edge-0",
      "from": "node-0",
      "to": "node-1",
      "pair": { "axis": "red", "child": "blue" },
      "next": { "axis": "green", "child": "yellow" },
      "nextNext": null
    }
  ]
}
```

## ライセンス

Apache License, Version 2.0 — 詳細は [LICENSE](./LICENSE) を参照してください。
