# Stock AI Navigator Pro Ver.3.1（Vercel完全静的版）

この版はHTML・CSS・JavaScriptだけで動きます。
Pythonファイル、requirements.txt、ビルド処理はありません。

## GitHubへアップロードするファイル
- index.html
- style.css
- app.js
- stocks.json
- manifest.webmanifest
- sw.js
- vercel.json
- README.md

## Vercel公開設定
- Framework Preset: Other
- Root Directory: 空欄
- Build Command: 空欄
- Output Directory: 空欄
- Install Command: 空欄

通常はGitHubリポジトリを選んで Deploy を押すだけで公開できます。

## 重要
以前のリポジトリに残っている以下のファイルは削除してください。
- requirements.txt
- update_data.py

残っているとVercelがPythonプロジェクトと誤判定する場合があります。
