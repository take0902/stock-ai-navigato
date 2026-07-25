# Stock AI Navigator Ver.2.1

## iPhone簡単アップロード版
この版はフォルダを使用しません。以下のファイルをGitHubの同じ場所へまとめてアップロードするだけです。

- index.html
- stocks.json
- config.json
- manifest.webmanifest
- sw.js
- README.md
- requirements.txt
- update_data.py

## GitHubへの上書き方法
1. GitHubのリポジトリを開く
2. 「…」または「Add file」を押す
3. 「Upload files」を押す
4. ZIPを展開したフォルダを開く
5. 上記8ファイルをすべて選択する
6. 「開く」を押す
7. 画面下の「Commit changes」を押す

同名ファイルは新しい内容で上書きされます。

## 現在の仕様
- 画面表示は `stocks.json` の保存済み株価データを使用
- RSI、MACD、移動平均、出来高、ATR評価
- 翌営業日・5営業日・20営業日の評価レンジ
- iPhone対応PWA

## 株価データの手動更新（パソコン利用時）
```bash
pip install -r requirements.txt
python update_data.py
```

更新後の `stocks.json` をGitHubへ再度アップロードします。

## 自動更新について
フォルダ不要にするため、GitHub Actionsの自動更新設定はこの版には入れていません。まずアプリ公開を完成させ、その後に自動更新だけを別工程で追加します。

## 注意
表示される上昇・横ばい・下落は、テクニカル指標を点数化した評価値です。将来の値動きを保証する確率ではありません。
