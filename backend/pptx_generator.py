"""
汎用提案書 PPTX ジェネレーター
python-pptx でスクラッチ生成（テンプレートなし）
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
import io


# ─── カラーパレット ────────────────────────────────────────────────
C = {
    "navy":    RGBColor(0x1B, 0x29, 0x5E),   # 濃紺（タイトル背景）
    "blue":    RGBColor(0x2E, 0x4F, 0xAA),   # 中青（セクション）
    "accent":  RGBColor(0xE8, 0x3A, 0x3A),   # 赤アクセント
    "light":   RGBColor(0xF0, 0xF4, 0xFF),   # 薄青（コンテンツ背景のヘッダー）
    "white":   RGBColor(0xFF, 0xFF, 0xFF),
    "dark":    RGBColor(0x1A, 0x1A, 0x1A),
    "gray":    RGBColor(0x55, 0x55, 0x55),
    "silver":  RGBColor(0xDD, 0xE3, 0xF0),
}

W = Inches(10.0)   # スライド幅 (16:9)
H = Inches(5.625)  # スライド高 (16:9)


def _set_bg(slide, color: RGBColor):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color


def _add_rect(slide, x, y, w, h, color: RGBColor):
    shape = slide.shapes.add_shape(
        1,  # MSO_SHAPE_TYPE.RECTANGLE
        x, y, w, h
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape


def _add_textbox(slide, text, x, y, w, h,
                 font_size=18, color=None, bold=False,
                 align=PP_ALIGN.LEFT, wrap=True):
    txb = slide.shapes.add_textbox(x, y, w, h)
    tf = txb.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(font_size)
    run.font.bold = bold
    if color:
        run.font.color.rgb = color
    return txb


def _make_title_slide(prs, slide_data: dict, meta: dict):
    """表紙スライド"""
    layout = prs.slide_layouts[6]  # 白紙
    slide = prs.slides.add_slide(layout)
    _set_bg(slide, C["navy"])

    # 左側の赤いアクセントバー
    _add_rect(slide, Inches(0), Inches(0), Inches(0.18), H, C["accent"])

    # タイトル
    title = slide_data.get("title") or meta.get("proposal_title", "提案書")
    _add_textbox(slide, title,
                 Inches(0.5), Inches(1.4), Inches(9.0), Inches(1.8),
                 font_size=32, color=C["white"], bold=True, wrap=True)

    # サブテキスト（クライアント名・日付・作成者）
    parts = [
        meta.get("client_name", ""),
        meta.get("date", ""),
        meta.get("author", ""),
    ]
    sub = "　　".join(p for p in parts if p)
    if sub:
        _add_textbox(slide, sub,
                     Inches(0.5), Inches(3.4), Inches(9.0), Inches(0.6),
                     font_size=14, color=C["silver"])

    # 下部ライン
    _add_rect(slide, Inches(0.5), Inches(4.5), Inches(9.0), Inches(0.04), C["accent"])


def _make_section_slide(prs, slide_data: dict):
    """セクション区切りスライド"""
    layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(layout)
    _set_bg(slide, C["blue"])

    _add_rect(slide, Inches(0), Inches(0), Inches(0.18), H, C["accent"])

    title = slide_data.get("title", "")
    _add_textbox(slide, title,
                 Inches(0.6), Inches(1.8), Inches(8.8), Inches(1.6),
                 font_size=30, color=C["white"], bold=True,
                 align=PP_ALIGN.LEFT)


def _make_toc_slide(prs, slide_data: dict):
    """目次スライド"""
    layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(layout)
    _set_bg(slide, C["white"])

    # ヘッダーバー
    _add_rect(slide, Inches(0), Inches(0), W, Inches(1.0), C["navy"])
    _add_rect(slide, Inches(0), Inches(1.0), W, Inches(0.06), C["accent"])

    title = slide_data.get("title", "目次")
    _add_textbox(slide, title,
                 Inches(0.4), Inches(0.1), Inches(9.2), Inches(0.8),
                 font_size=22, color=C["white"], bold=True)

    # 箇条書き
    items = slide_data.get("body", [])
    if items:
        y = Inches(1.3)
        for i, item in enumerate(items):
            bullet = f"  {i+1:02d}　{item}"
            _add_textbox(slide, bullet,
                         Inches(0.8), y, Inches(8.5), Inches(0.4),
                         font_size=14, color=C["dark"])
            y += Inches(0.42)


def _make_content_slide(prs, slide_data: dict):
    """通常コンテンツスライド"""
    layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(layout)
    _set_bg(slide, C["white"])

    # ヘッダーバー
    _add_rect(slide, Inches(0), Inches(0), W, Inches(1.0), C["navy"])
    _add_rect(slide, Inches(0), Inches(1.0), W, Inches(0.06), C["accent"])

    title = slide_data.get("title", "")
    _add_textbox(slide, title,
                 Inches(0.4), Inches(0.1), Inches(9.2), Inches(0.8),
                 font_size=22, color=C["white"], bold=True)

    items = slide_data.get("body", [])
    visual_hint = slide_data.get("visual_hint", "")

    if items:
        y = Inches(1.3)
        for item in items:
            # 箇条書き行
            _add_textbox(slide, f"▶  {item}",
                         Inches(0.5), y, Inches(9.0), Inches(0.45),
                         font_size=13, color=C["dark"])
            # 下線
            _add_rect(slide, Inches(0.5), y + Inches(0.4),
                      Inches(8.8), Inches(0.01), C["silver"])
            y += Inches(0.5)

    if visual_hint:
        _add_textbox(slide, f"📊 {visual_hint}",
                     Inches(0.5), Inches(5.1), Inches(9.0), Inches(0.35),
                     font_size=9, color=RGBColor(0x99, 0x99, 0x99))


def _make_closing_slide(prs, slide_data: dict, meta: dict):
    """クロージングスライド"""
    layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(layout)
    _set_bg(slide, C["navy"])

    _add_rect(slide, Inches(0), Inches(0), Inches(0.18), H, C["accent"])

    title = slide_data.get("title", "ご清聴ありがとうございました")
    _add_textbox(slide, title,
                 Inches(0.5), Inches(1.6), Inches(9.0), Inches(1.4),
                 font_size=28, color=C["white"], bold=True,
                 align=PP_ALIGN.CENTER)

    author = meta.get("author", "")
    if author:
        _add_textbox(slide, author,
                     Inches(0.5), Inches(3.4), Inches(9.0), Inches(0.5),
                     font_size=14, color=C["silver"],
                     align=PP_ALIGN.CENTER)

    _add_rect(slide, Inches(2.0), Inches(3.0), Inches(6.0), Inches(0.04), C["accent"])


# ─── メイン関数 ────────────────────────────────────────────────────

def generate_proposal_pptx(content: dict) -> bytes:
    """
    content 辞書から PPTX を生成して bytes で返す。

    content = {
        "client_name": str,
        "proposal_title": str,
        "date": str,
        "author": str,
        "slides": [
            {
                "type": "title|section|toc|content|closing",
                "title": str,
                "body": [str, ...],
                "notes": str,
                "visual_hint": str,
            },
            ...
        ]
    }
    """
    prs = Presentation()
    prs.slide_width = W
    prs.slide_height = H

    meta = {
        "client_name":    content.get("client_name", ""),
        "proposal_title": content.get("proposal_title", "提案書"),
        "date":           content.get("date", ""),
        "author":         content.get("author", ""),
    }

    for slide_data in content.get("slides", []):
        stype = slide_data.get("type", "content")

        if stype == "title":
            _make_title_slide(prs, slide_data, meta)
        elif stype == "section":
            _make_section_slide(prs, slide_data)
        elif stype == "toc":
            _make_toc_slide(prs, slide_data)
        elif stype == "closing":
            _make_closing_slide(prs, slide_data, meta)
        else:
            _make_content_slide(prs, slide_data)

        # スピーカーノート
        notes_text = slide_data.get("notes", "")
        if notes_text:
            slide = prs.slides[-1]
            if slide.has_notes_slide:
                slide.notes_slide.notes_text_frame.text = notes_text

    buf = io.BytesIO()
    prs.save(buf)
    buf.seek(0)
    return buf.read()
