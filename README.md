# Stock AI Navigator Ver.2（無料データ版）

## 概要
- 主取得：yfinance
- 予備取得：Stooq CSV
- 最終予備：前回保存した `data/stocks.json`
- テクニカル：5/25/75日線、RSI、MACD、ボリンジャーバンド、ATR、出来高
- 表示：翌営業日・5営業日・20営業日の評価レンジ
- iPhone対応PWA

## 最初の確認
`index.html` はローカルファイル直開きではJSON取得が制限される場合があります。以下のいずれかで開いてください。

### パソコンで確認
```bash
python -m http.server 8000
```
ブラウザで `http://localhost:8000` を開きます。

### 株価データを更新
```bash
pip install -r requirements.txt
python scripts/update_data.py
```

## GitHubで毎営業日自動更新
`.github/workflows/update-stock-data.yml` が平日16:30頃（日本時間）に更新します。GitHubの Actions を有効にし、リポジトリの Workflow permissions を Read and write にしてください。

## Vercel公開
このフォルダをGitHubへアップロードし、Vercelでリポジトリを選択します。Framework Presetは Other、Build Commandは空欄、Output Directoryは `.` です。

## 銘柄追加
`config.json` の `symbols` に追加します。日本株はYahoo形式の `証券コード.T` を使用します。

## 重要事項
本アプリの上昇・横ばい・下落表示は、指標を点数化した「評価値」であり、将来の値動きを保証する確率ではありません。yfinanceはYahoo公式ではなく、個人・研究用途を前提とするツールです。公開・商用利用では各データ提供元の利用条件を確認してください。
