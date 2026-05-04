# 提案書ジェネレーター — デプロイ手順書

AIが与件からPowerPoint提案書を自動生成するWebアプリです。

- **バックエンド**: Python + FastAPI + python-pptx → **Railway** にデプロイ
- **フロントエンド**: Next.js (React) → **Vercel** にデプロイ

---

## 事前準備

1. [GitHub](https://github.com) アカウント
2. [Railway](https://railway.app) アカウント（GitHub連携）
3. [Vercel](https://vercel.com) アカウント（GitHub連携）
4. Anthropic API キー（https://console.anthropic.com）

---

## STEP 1: GitHub にコードを push する

```bash
# プロジェクトルートで実行
cd proposal-web-app
git init
git add .
git commit -m "initial commit"

# GitHub で新しいリポジトリを作成し、以下を実行
git remote add origin https://github.com/your-username/proposal-web-app.git
git push -u origin main
```

---

## STEP 2: バックエンドを Railway にデプロイ

1. [railway.app](https://railway.app) にアクセス → 「New Project」
2. 「Deploy from GitHub repo」を選択 → リポジトリを選択
3. **Root Directory** を `backend` に設定
4. 「Variables」タブで環境変数を追加:

   | 変数名 | 値 |
   |--------|-----|
   | `ANTHROPIC_API_KEY` | `sk-ant-xxxxx`（実際のキー） |
   | `ALLOWED_ORIGINS` | `https://your-app.vercel.app`（後で更新） |

5. デプロイが完了すると Railway が URL を発行（例: `https://proposal-api-xxxx.up.railway.app`）
6. この URL をメモしておく

---

## STEP 3: フロントエンドを Vercel にデプロイ

1. [vercel.com](https://vercel.com) にアクセス → 「Add New → Project」
2. 先ほどの GitHub リポジトリをインポート
3. **Root Directory** を `frontend` に設定
4. 「Environment Variables」で追加:

   | 変数名 | 値 |
   |--------|-----|
   | `NEXT_PUBLIC_API_URL` | Railway の URL（例: `https://proposal-api-xxxx.up.railway.app`） |

5. 「Deploy」をクリック
6. Vercel が URL を発行（例: `https://your-app.vercel.app`）

---

## STEP 4: CORS 設定を更新

Vercel の URL が確定したら Railway の環境変数を更新します。

1. Railway のプロジェクト → 「Variables」
2. `ALLOWED_ORIGINS` の値を Vercel の URL に変更:
   ```
   https://your-app.vercel.app
   ```
3. 自動で再デプロイされます

---

## ローカル開発

### バックエンド起動

```bash
cd backend

# 仮想環境作成（初回）
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# ライブラリインストール
pip install -r requirements.txt

# .env ファイルを作成
cp .env.example .env
# .env を開いて ANTHROPIC_API_KEY を設定

# 起動
uvicorn main:app --reload --port 8000
```

### フロントエンド起動

```bash
cd frontend

# ライブラリインストール（初回）
npm install

# .env.local を作成
cp .env.local.example .env.local

# 起動
npm run dev
```

ブラウザで http://localhost:3000 を開く

---

## ファイル構成

```
proposal-web-app/
├── backend/
│   ├── main.py             # FastAPI エンドポイント
│   ├── pptx_generator.py   # PowerPoint 生成ロジック
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
└── frontend/
    ├── app/
    │   ├── page.tsx        # メインUI（3ステップウィザード）
    │   ├── layout.tsx
    │   └── globals.css
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    └── .env.local.example
```

---

## API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/health` | 死活確認 |
| POST | `/generate-structure` | 与件からスライド構成を生成 |
| POST | `/generate-pptx` | スライド構成から PPTX を生成 |

---

## コスト目安

| サービス | 無料枠 | 超過時 |
|---------|--------|-------|
| Railway | $5/月クレジット付き | 従量課金 |
| Vercel | 無料（個人利用） | Pro $20/月〜 |
| Anthropic API | 従量課金 | 1提案書あたり約$0.02〜0.05 |
