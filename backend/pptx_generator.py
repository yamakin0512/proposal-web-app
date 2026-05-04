"""
PowerPoint 生成モジュール (v2)
- generate_proposal_pptx : テンプレートなし（デフォルト）
- generate_from_template : ユーザーPPTXテンプレートを使って生成
"""

import io
from typing import Optional

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Emu, Inches, Pt

# ─── カラーパレット（デフォルト） ────────────────────────────────
C_NAVY  = RGBColor(0x1B, 0x29, 0x5E)
C_RED   = RGBColor(0xE8, 0x3A, 0x3A)
C_WHITE = RGBColor(0xFF, 0xFF, 0xFF)
C_GRAY  = RGBColor(0x55, 0x55, 0x55)
C_LIGHT = RGBColor(0xF5, 0xF7, 0xFA)
C_IMG_BG= RGBColor(0xE8, 0xF4, 0xFF)   # 画像プレースホルダー背景
C_IMG_BD= RGBColor(0x4A, 0x90, 0xD9)   # 画像プレースホルダー枠線

SLIDE_W = Inches(13.33)
SLIDE_H = Inches(7.5)


# ══════════════════════════════════════════════════════════════════
#  ① デフォルト生成（テンプレートなし）
# ══════════════════════════════════════════════════════════════════
def generate_proposal_pptx(data: dict) -> bytes:
    prs = Presentation()
    prs.slide_width  = SLIDE_W
    prs.slide_height = SLIDE_H

    blank_layout = prs.slide_layouts[6]  # 完全な白紙

    for slide_data in data.get("slides", []):
        slide = prs.slides.add_slide(blank_layout)
        stype = slide_data.get("type", "content")

        if stype == "title":
            _draw_title_slide(slide, slide_data, data)
        elif stype == "toc":
            _draw_toc_slide(slide, slide_data)
        elif stype == "section":
            _draw_section_slide(slide, slide_data)
        elif stype == "closing":
            _draw_closing_slide(slide, slide_data, data)
        else:
            _draw_content_slide(slide, slide_data)

    out = io.BytesIO()
    prs.save(out)
    return out.getvalue()


# ─── スライド描画ヘルパー ─────────────────────────────────────────

def _set_bg(slide, color: RGBColor):
    from pptx.oxml.ns import qn
    from lxml import etree
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color


def _add_textbox(slide, left, top, width, height, text,
                 font_size=18, bold=False, color=C_NAVY,
                 align=PP_ALIGN.LEFT, wrap=True) -> None:
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run.font.color.rgb = color


def _add_rect(slide, left, top, width, height, fill_color: RGBColor,
              line_color: Optional[RGBColor] = None) -> None:
    shape = slide.shapes.add_shape(
        1,  # MSO_SHAPE_TYPE.RECTANGLE
        left, top, width, height
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if line_color:
        shape.line.color.rgb = line_color
    else:
        shape.line.fill.background()


def _add_image_prompt_box(slide, left, top, width, height, prompt_text: str):
    """画像生成AIへのプロンプトを表示するプレースホルダー枠"""
    from pptx.util import Pt
    from pptx.oxml.ns import qn
    from lxml import etree

    # 背景枠
    shape = slide.shapes.add_shape(1, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = C_IMG_BG
    shape.line.color.rgb = C_IMG_BD
    shape.line.width = Pt(1.5)

    # ラベル
    label_h = Inches(0.35)
    _add_rect(slide, left, top, width, label_h, C_IMG_BD)
    _add_textbox(slide, left + Inches(0.1), top, width - Inches(0.1), label_h,
                 "🎨  AI 画像生成プロンプト（Gemini / ChatGPT に貼り付けてください）",
                 font_size=8, bold=True, color=C_WHITE)

    # プロンプト本文
    _add_textbox(slide,
                 left + Inches(0.15),
                 top + label_h + Inches(0.05),
                 width - Inches(0.3),
                 height - label_h - Inches(0.1),
                 prompt_text,
                 font_size=9, color=RGBColor(0x1A, 0x4A, 0x7A), wrap=True)


# ─── 各スライドタイプ ──────────────────────────────────────────────

def _draw_title_slide(slide, sd, data):
    _set_bg(slide, C_NAVY)
    _add_rect(slide, 0, Inches(5.5), SLIDE_W, Inches(2), C_RED)

    _add_textbox(slide, Inches(1), Inches(1.2), Inches(11), Inches(1.5),
                 sd.get("title", ""), font_size=36, bold=True, color=C_WHITE,
                 align=PP_ALIGN.LEFT)

    subtitle = " | ".join(sd.get("body", []))
    if subtitle:
        _add_textbox(slide, Inches(1), Inches(2.8), Inches(11), Inches(0.8),
                     subtitle, font_size=18, color=RGBColor(0xAA, 0xBB, 0xFF))

    meta = f"{data.get('date', '')}　{data.get('author', '')}"
    _add_textbox(slide, Inches(1), Inches(6.0), Inches(11), Inches(0.6),
                 meta, font_size=14, color=C_WHITE)


def _draw_toc_slide(slide, sd):
    _set_bg(slide, C_LIGHT)
    _add_rect(slide, 0, 0, Inches(0.3), SLIDE_H, C_NAVY)
    _add_textbox(slide, Inches(0.6), Inches(0.4), Inches(11), Inches(0.7),
                 sd.get("title", "目次"), font_size=24, bold=True, color=C_NAVY)
    _add_rect(slide, Inches(0.6), Inches(1.1), Inches(11.5), Pt(2), C_RED)

    for i, item in enumerate(sd.get("body", [])):
        y = Inches(1.4) + i * Inches(0.55)
        _add_rect(slide, Inches(0.65), y + Inches(0.1), Inches(0.35), Inches(0.35), C_NAVY)
        _add_textbox(slide, Inches(1.2), y, Inches(10.5), Inches(0.5),
                     item, font_size=16, color=C_NAVY)


def _draw_section_slide(slide, sd):
    _set_bg(slide, C_NAVY)
    _add_rect(slide, 0, Inches(3.2), SLIDE_W, Pt(3), C_RED)
    _add_textbox(slide, Inches(1.5), Inches(2.5), Inches(10), Inches(1.2),
                 sd.get("title", ""), font_size=32, bold=True, color=C_WHITE,
                 align=PP_ALIGN.CENTER)
    if sd.get("body"):
        _add_textbox(slide, Inches(1.5), Inches(3.8), Inches(10), Inches(0.7),
                     sd["body"][0], font_size=16, color=RGBColor(0xAA, 0xBB, 0xFF),
                     align=PP_ALIGN.CENTER)


def _draw_closing_slide(slide, sd, data):
    _set_bg(slide, C_NAVY)
    _add_rect(slide, 0, 0, Inches(0.5), SLIDE_H, C_RED)
    _add_textbox(slide, Inches(1.2), Inches(1.8), Inches(11), Inches(1.2),
                 sd.get("title", ""), font_size=30, bold=True, color=C_WHITE)

    for i, item in enumerate(sd.get("body", [])):
        _add_textbox(slide, Inches(1.2), Inches(3.2) + i * Inches(0.55),
                     Inches(11), Inches(0.5),
                     f"・{item}", font_size=14, color=RGBColor(0xCC, 0xDD, 0xFF))

    meta = f"{data.get('author', '')}　{data.get('date', '')}"
    _add_textbox(slide, Inches(1.2), Inches(6.7), Inches(11), Inches(0.5),
                 meta, font_size=12, color=RGBColor(0x88, 0x99, 0xBB))


def _draw_content_slide(slide, sd):
    _set_bg(slide, C_LIGHT)
    _add_rect(slide, 0, 0, Inches(0.3), SLIDE_H, C_NAVY)
    _add_rect(slide, Inches(0.6), Inches(1.1), Inches(11.5), Pt(2), C_RED)

    _add_textbox(slide, Inches(0.6), Inches(0.25), Inches(11.5), Inches(0.75),
                 sd.get("title", ""), font_size=22, bold=True, color=C_NAVY)

    image_prompt = sd.get("image_prompt", "").strip()
    body = sd.get("body", [])

    if image_prompt:
        # テキスト左 60% ＋ 画像プレースホルダー右 38%
        text_w = Inches(7.5)
        img_x  = Inches(8.3)
        img_w  = Inches(4.7)
        img_y  = Inches(1.3)
        img_h  = Inches(5.8)
        _add_image_prompt_box(slide, img_x, img_y, img_w, img_h, image_prompt)
    else:
        text_w = Inches(12.0)

    # 本文（箇条書き）
    for i, item in enumerate(body):
        y = Inches(1.35) + i * Inches(0.72)
        if y + Inches(0.7) > SLIDE_H - Inches(0.2):
            break
        _add_rect(slide, Inches(0.65), y + Inches(0.18), Inches(0.12), Inches(0.35), C_RED)
        _add_textbox(slide, Inches(0.9), y, text_w - Inches(0.3), Inches(0.7),
                     item, font_size=15, color=C_GRAY, wrap=True)

    if sd.get("visual_hint") and not image_prompt:
        _add_textbox(slide,
                     Inches(0.65), SLIDE_H - Inches(0.55),
                     Inches(12), Inches(0.4),
                     f"📊 {sd['visual_hint']}",
                     font_size=10, color=RGBColor(0x99, 0x99, 0x99))


# ══════════════════════════════════════════════════════════════════
#  ② テンプレートベース生成
# ══════════════════════════════════════════════════════════════════
def generate_from_template(data: dict, template_bytes: bytes) -> bytes:
    """ユーザーのPPTXテンプレートを使ってスライドを生成する。
    テンプレートのスライドマスター（デザイン・色・フォント）を継承し、
    全スライドを新しいコンテンツで置き換える。"""
    prs = Presentation(io.BytesIO(template_bytes))

    # ─── 既存スライドを全削除（マスターは保持） ──────────────
    xml_slides = prs.slides._sldIdLst
    for i in range(len(prs.slides) - 1, -1, -1):
        rId = xml_slides[i].rId
        prs.part.drop_rel(rId)
        xml_slides.remove(xml_slides[i])

    # ─── レイアウト選択ヘルパー ───────────────────────────────
    def pick_layout(preferred_names: list, fallback_idx: int = 1):
        for name in preferred_names:
            for layout in prs.slide_layouts:
                if layout.name.lower() == name.lower():
                    return layout
        idx = min(fallback_idx, len(prs.slide_layouts) - 1)
        return prs.slide_layouts[idx]

    # ─── 各スライドを追加 ──────────────────────────────────────
    for sd in data.get("slides", []):
        stype = sd.get("type", "content")

        if stype == "title":
            layout = pick_layout(["Title Slide", "タイトル スライド", "Title"], 0)
        elif stype == "section":
            layout = pick_layout(["Section Header", "セクション見出し", "Title Only", "タイトルのみ"], 2)
        elif stype == "toc":
            layout = pick_layout(["Title and Content", "タイトルとコンテンツ", "Title, Content"], 1)
        elif stype == "closing":
            layout = pick_layout(["Title Slide", "タイトル スライド", "Blank", "空白"], 0)
        else:
            layout = pick_layout(["Title and Content", "タイトルとコンテンツ", "Title, Content"], 1)

        slide = prs.slides.add_slide(layout)
        _apply_content_to_template_slide(slide, sd, data, prs)

    out = io.BytesIO()
    prs.save(out)
    return out.getvalue()


def _apply_content_to_template_slide(slide, sd: dict, data: dict, prs: Presentation):
    """テンプレートスライドのプレースホルダーにコンテンツを流し込む。"""
    title_text = sd.get("title", "")
    body_items = sd.get("body", [])
    image_prompt = sd.get("image_prompt", "").strip()

    # プレースホルダーにテキストをセット
    title_set = False
    body_set  = False

    for ph in slide.placeholders:
        idx = ph.placeholder_format.idx
        if idx == 0 and not title_set:          # タイトル
            ph.text = title_text
            title_set = True
        elif idx == 1 and not body_set:         # 本文
            tf = ph.text_frame
            tf.clear()
            for i, item in enumerate(body_items):
                if i == 0:
                    tf.paragraphs[0].text = item
                else:
                    p = tf.add_paragraph()
                    p.text = item
                    p.level = 0
            body_set = True
        elif idx in (2, 3, 4) and not body_set and body_items:
            ph.text = "\n".join(body_items)
            body_set = True

    # プレースホルダーがない場合はテキストボックスを追加
    if not title_set:
        _add_textbox(slide, Inches(0.5), Inches(0.3), Inches(12.0), Inches(0.9),
                     title_text, font_size=24, bold=True)

    if not body_set and body_items:
        for i, item in enumerate(body_items):
            _add_textbox(slide,
                         Inches(0.7), Inches(1.4) + i * Inches(0.65),
                         Inches(11.5), Inches(0.6),
                         f"・{item}", font_size=14, color=C_GRAY, wrap=True)

    # 画像プロンプト枠を追加
    if image_prompt:
        _add_image_prompt_box(
            slide,
            Inches(7.8), Inches(1.4), Inches(5.2), Inches(5.7),
            image_prompt
        )
