# koeki-foundation-db-public

公益財団法人の公開データを閲覧するための静的Webビューアです。

## 含まれるファイル

- `index.html`
- `app.js`
- `style.css`
- `data.json`

## 含めないファイル

- `scripts/` などの収集・更新スクリプト
- `config.yaml` などの運用設定
- `*.db` などのローカル生成物

## ローカル確認

以下のコマンドで静的配信できます。

```powershell
python -m http.server 8787
```

ブラウザで `http://localhost:8787` を開いてください。

## GitHub Pages

このディレクトリをリポジトリルートとして公開すれば、そのままGitHub Pagesで配信できます。

## インデックス抑止

- `index.html` に `robots` / `googlebot` の `noindex` メタタグを設定
- `robots.txt` で全クローラーに `Disallow: /` を設定

注: 検索エンジン側の反映には時間差があり、過去に取得済みURLは即時には消えない場合があります。
