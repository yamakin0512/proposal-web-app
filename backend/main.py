"""
提案書自動生成 API — FastAPI バックエンド
"""

import json
import os
import re
from typing import List, Optional

import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from pptx_generator import generate_proposal_pptx


# ─── アプリ設定 ───────────────────────────────────────────────────
app = FastAPI(title="提案書生成 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

claude = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


# ─── スキーマ ─────────────────────────────────────────────────────
class ProposalRequest(BaseModel):
    client_name: str
    category: str          # digital_marketing / consulting / dx_system / general
    requirements: str
    date: Optional[str] = ""
    author: Optional[str] = ""


class SlideItem(BaseModel):
    type: str              # title / section / toc / content / closing
    title: str
    body: Optional[List[str]] = []
    notes: Optional[str] = ""
    visual_hint: Optional[str] = ""


class ProposalStructure(BaseModel):
    client_name: str
    proposal_title: str
    date: Optional[str] = ""
    author: Optional[str] = ""
    slides: List[SlideItem]


# ─── カテゴリ別ガイド ─────────────────────────────────────────────
CATEGORY_GUIDES = {
    "digital_marketing": "デジタルマーケティング支援提案（SEO・広告・SNS・GA4・CRM等）。現状分析→施策詳細→KPI→ロードマップの流れで。",
    "consulting":        "コンサル・戦略提案。3C/SWOT分析→課題構造化→戦略方向性→施策→ROIの流れで。",
    "dx_system":         "システム・DX提案。As-Is/To-Be→ソリューション概要→機能→導入ステップ→費用の流れで。",
    "general":           "汎用提案。エグゼクティブサマリー→現状課題→提案内容→期待効果→費用・スケジュールの流れで。",
}


# ─── エンドポイント ───────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/generate-structure")
async def generate_structure(req: ProposalRequest):
    """
    与件から Claude がスライド構成 JSON を生成して返す。
    フロントエンドで確認後、/generate-pptx に渡す。
    """
    guide = CATEGORY_GUIDES.get(req.category, CATEGORY_GUIDES["general"])

    prompt = f"""
あなたは優秀な提案書ライターです。以下の与件から、説得力のある提案書のスライド構成を作成してください。

## 与件
- クライアント名: {req.client_name}
- カテゴリ: {guide}
- 要件・背景: {req.requirements}
- 日付: {req.date or "未記入"}
- 作成者: {req.author or "未記入"}

## 出力形式
必ず以下の JSON のみを返してください（説明文・マークダウン不要）:

{{
  "proposal_title": "提案書タイトル（クライアント名＋内容を含む）",
  "slides": [
    {{
      "type": "title",
      "title": "表紙タイトル",
      "body": [],
      "notes": "スピーカーノート",
      "visual_hint": ""
    }},
    ...
  ]
}}

## ルール
- type は title / section / toc / content / closing のいずれか
- 最初のスライドは必ず type: "title"、最後は type: "closing"
- 2枚目は type: "toc"（目次）推奨
- スライド総数は 10〜14 枚
- body は箇条書き文字列の配列（1スライドあたり3〜6項目）
- visual_hint は「棒グラフ: 月別CV数推移」のような視覚化メモ（任意、不要なら空文字）
- notes はプレゼン時の補足（任意）
"""

    try:
        message = claude.messages.create(
            model="claude-opus-4-6",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()

        # JSON 部分だけ抽出
        match = re.search(r"\{[\s\S]*\}", raw)
        if not match:
            raise ValueError("JSON が見つかりませんでした")
        data = json.loads(match.group())

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"構成生成に失敗しました: {e}")

    return {
        "client_name":    req.client_name,
        "proposal_title": data.get("proposal_title", f"{req.client_name} 提案書"),
        "date":           req.date,
        "author":         req.author,
        "slides":         data.get("slides", []),
    }


@app.post("/generate-pptx")
async def generate_pptx(structure: ProposalStructure):
    """
    確認済みのスライド構成から PPTX ファイルを生成して返す。
    """
    try:
        pptx_bytes = generate_proposal_pptx(structure.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PPTX 生成に失敗しました: {e}")

    filename = f"提案書_{structure.client_name}.pptx"
    return Response(
        content=pptx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={
            "Content-Disposition": f'attachment; filename*=UTF-8\'\'{filename}',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
