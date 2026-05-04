'use client'

import { useEffect, useRef, useState } from 'react'

// ─── 型定義 ───────────────────────────────────────────────────────
type SlideType = 'title' | 'section' | 'toc' | 'content' | 'closing'

interface Slide {
  type: SlideType
  title: string
  body: string[]
  notes: string
  visual_hint: string
  image_prompt: string
}

interface ProposalStructure {
  client_name: string
  proposal_title: string
  date: string
  author: string
  slides: Slide[]
  template_id: string
  usage: {
    input_tokens: number
    output_tokens: number
    model: string
    estimated_cost_usd: number
  }
}

interface Template {
  id: string
  name: string
  filename: string
}

type Step = 'input' | 'confirm' | 'done'

const CATEGORY_LABELS: Record<string, string> = {
  digital_marketing: 'デジタルマーケティング支援',
  consulting:        'コンサル・戦略提案',
  dx_system:         'システム・DX提案',
  general:           '汎用・その他',
}

const SLIDE_TYPE_LABELS: Record<string, string> = {
  title:   '表紙',
  section: 'セクション',
  toc:     '目次',
  content: 'コンテンツ',
  closing: 'クロージング',
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ─── ステッパー ───────────────────────────────────────────────────
function Stepper({ step }: { step: Step }) {
  const steps = [
    { key: 'input',   label: '①　与件入力' },
    { key: 'confirm', label: '②　構成確認' },
    { key: 'done',    label: '③　完成・ダウンロード' },
  ]
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors
            ${step === s.key ? 'bg-[#1B295E] text-white shadow' : 'bg-gray-200 text-gray-500'}`}>
            {s.label}
          </div>
          {i < steps.length - 1 && <div className="w-8 h-0.5 bg-gray-300 mx-1" />}
        </div>
      ))}
    </div>
  )
}

// ─── テンプレート管理パネル ───────────────────────────────────────
function TemplatePanel({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (id: string) => void
}) {
  const [open, setOpen]         = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [uploading, setUploading] = useState(false)
  const [name, setName]         = useState('')
  const fileRef                 = useRef<HTMLInputElement>(null)
  const [msg, setMsg]           = useState('')

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API}/templates`)
      if (res.ok) setTemplates(await res.json())
    } catch {}
  }

  useEffect(() => { fetchTemplates() }, [])

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file || !name.trim()) { setMsg('テンプレート名とファイルを入力してください'); return }
    setUploading(true); setMsg('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', name)
      const res = await fetch(`${API}/upload-template`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error('アップロード失敗')
      const t: Template = await res.json()
      setMsg(`✅ "${t.name}" を登録しました`)
      setName('')
      if (fileRef.current) fileRef.current.value = ''
      fetchTemplates()
    } catch (e: unknown) {
      setMsg(`❌ ${e instanceof Error ? e.message : 'エラー'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    await fetch(`${API}/templates/${id}`, { method: 'DELETE' })
    if (selectedId === id) onSelect('')
    fetchTemplates()
  }

  return (
    <div className="border border-gray-200 rounded-xl mb-6 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700 transition-colors"
      >
        <span>📁 テンプレート管理</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="p-5 space-y-4 bg-white">
          {/* テンプレート選択 */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">使用するテンプレート</p>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input type="radio" checked={selectedId === ''} onChange={() => onSelect('')} />
                デフォルト（自動生成）
              </label>
              {templates.map(t => (
                <div key={t.id} className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input type="radio" checked={selectedId === t.id} onChange={() => onSelect(t.id)} />
                    {t.name} <span className="text-xs text-gray-400">({t.filename})</span>
                  </label>
                  <button onClick={() => handleDelete(t.id)}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 border border-red-200 rounded hover:bg-red-50 transition-colors">
                    削除
                  </button>
                </div>
              ))}
              {templates.length === 0 && (
                <p className="text-xs text-gray-400 italic">テンプレートが登録されていません</p>
              )}
            </div>
          </div>

          {/* 新規アップロード */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">新しいテンプレートを登録</p>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="テンプレート名（例：標準提案書テンプレート）"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B295E]"
              />
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept=".pptx"
                  className="flex-1 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 file:mr-2 file:text-xs file:border-0 file:bg-gray-100 file:rounded file:px-2 file:py-1" />
                <button onClick={handleUpload} disabled={uploading}
                  className="px-4 py-2 bg-[#1B295E] text-white text-xs font-semibold rounded-lg hover:bg-[#2E4FAA] disabled:opacity-50 transition-colors">
                  {uploading ? '登録中…' : '登録'}
                </button>
              </div>
              {msg && <p className={`text-xs ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
                ⚠️ テンプレートはサーバー再起動時にリセットされます。毎回の利用前に再登録をお願いします。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 参考資料アップロード ─────────────────────────────────────────
function ReferenceUpload({ onExtracted }: { onExtracted: (text: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [info, setInfo]       = useState('')
  const fileRef               = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setLoading(true); setInfo('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${API}/extract-reference`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error('テキスト抽出に失敗しました')
      const data = await res.json()
      onExtracted(data.text)
      setInfo(`✅ ${file.name}（${data.chars.toLocaleString()} 文字）を読み込みました`)
    } catch (e: unknown) {
      setInfo(`❌ ${e instanceof Error ? e.message : 'エラー'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    onExtracted('')
    setInfo('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        参考資料（RFP・仕様書など）
        <span className="ml-2 text-xs font-normal text-gray-400">PDF / Word / PPTX</span>
      </label>
      <div className="flex gap-2">
        <input ref={fileRef} type="file" accept=".pdf,.docx,.pptx"
          className="flex-1 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-2 file:mr-2 file:text-xs file:border-0 file:bg-gray-100 file:rounded file:px-2 file:py-1" />
        <button onClick={handleUpload} disabled={loading}
          className="px-4 py-2 bg-gray-700 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors whitespace-nowrap">
          {loading ? '読込中…' : '読み込む'}
        </button>
        {info.startsWith('✅') && (
          <button onClick={handleClear}
            className="px-3 py-2 border border-gray-200 text-xs rounded-lg text-gray-500 hover:bg-gray-50">
            クリア
          </button>
        )}
      </div>
      {info && (
        <p className={`text-xs mt-1 ${info.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
          {info}
        </p>
      )}
    </div>
  )
}

// ─── API利用量バッジ ──────────────────────────────────────────────
function UsageBadge({ usage }: { usage: ProposalStructure['usage'] }) {
  if (!usage?.input_tokens) return null
  const costJpy = Math.round(usage.estimated_cost_usd * 150)
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1">
        📥 入力 {usage.input_tokens.toLocaleString()} tokens
      </span>
      <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-3 py-1">
        📤 出力 {usage.output_tokens.toLocaleString()} tokens
      </span>
      <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1">
        💰 約 ${usage.estimated_cost_usd.toFixed(4)}（≒ {costJpy} 円）
      </span>
    </div>
  )
}

// ─── ステップ1: 入力フォーム ──────────────────────────────────────
function InputStep({ onNext }: { onNext: (structure: ProposalStructure) => void }) {
  const [form, setForm] = useState({
    client_name:  '',
    category:     'general',
    requirements: '',
    date:         '',
    author:       '',
  })
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [referenceText, setReferenceText]           = useState('')
  const [loading, setLoading]                       = useState(false)
  const [error, setError]                           = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.client_name.trim() || !form.requirements.trim()) {
      setError('クライアント名と要件・背景は必須です'); return
    }
    setError(''); setLoading(true)
    try {
      const res = await fetch(`${API}/generate-structure`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          reference_text: referenceText,
          template_id:    selectedTemplateId,
        }),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(detail.detail ?? `エラー: ${res.status}`)
      }
      onNext(await res.json())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <TemplatePanel selectedId={selectedTemplateId} onSelect={setSelectedTemplateId} />

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          クライアント名 <span className="text-red-500">*</span>
        </label>
        <input type="text" placeholder="例: 株式会社〇〇"
          value={form.client_name}
          onChange={e => setForm({ ...form, client_name: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B295E]" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">提案カテゴリ</label>
        <select value={form.category}
          onChange={e => setForm({ ...form, category: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B295E] bg-white">
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          要件・背景・課題 <span className="text-red-500">*</span>
        </label>
        <textarea rows={5} placeholder="例: ECサイトのセッション数が前年比30%減少しており…"
          value={form.requirements}
          onChange={e => setForm({ ...form, requirements: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B295E] resize-none" />
      </div>

      <ReferenceUpload onExtracted={setReferenceText} />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">日付</label>
          <input type="text" placeholder="例: 2026年5月"
            value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B295E]" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">作成者・会社名</label>
          <input type="text" placeholder="例: 株式会社△△"
            value={form.author} onChange={e => setForm({ ...form, author: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B295E]" />
        </div>
      </div>

      {selectedTemplateId && (
        <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          📁 選択中のテンプレートでPowerPointを生成します
        </div>
      )}
      {referenceText && (
        <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          📄 参考資料を読み込み済み — 提案内容に反映されます
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
      )}

      <button type="submit" disabled={loading}
        className="w-full bg-[#1B295E] hover:bg-[#2E4FAA] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            AIがスライド構成を生成中…
          </>
        ) : 'スライド構成を生成する →'}
      </button>
    </form>
  )
}

// ─── ステップ2: 構成確認 ──────────────────────────────────────────
function ConfirmStep({
  structure,
  onBack,
  onGenerate,
}: {
  structure: ProposalStructure
  onBack: () => void
  onGenerate: (s: ProposalStructure) => void
}) {
  const [slides, setSlides] = useState<Slide[]>(structure.slides)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const updateSlide = (i: number, key: keyof Slide, value: string | string[]) =>
    setSlides(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: value } : s))

  const handleGenerate = async () => {
    setError(''); setLoading(true)
    try {
      const payload = { ...structure, slides }
      const res = await fetch(`${API}/generate-pptx`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(detail.detail ?? `エラー: ${res.status}`)
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `提案書_${structure.client_name}.pptx`
      a.click()
      URL.revokeObjectURL(url)
      onGenerate({ ...structure, slides })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const typeColor: Record<string, string> = {
    title:   'bg-[#1B295E] text-white',
    section: 'bg-[#2E4FAA] text-white',
    toc:     'bg-gray-500 text-white',
    content: 'bg-gray-100 text-gray-700',
    closing: 'bg-[#E83A3A] text-white',
  }

  const imgCount = slides.filter(s => s.image_prompt).length

  return (
    <div className="space-y-4">
      {/* ヘッダー情報 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        <strong>{structure.proposal_title}</strong>
        <br />
        <span className="text-blue-600">スライド数: {slides.length}枚</span>
        {imgCount > 0 && (
          <span className="ml-3 text-blue-600">🎨 画像プロンプト: {imgCount}枚</span>
        )}
        {structure.template_id && (
          <span className="ml-3 text-blue-600">📁 テンプレート適用</span>
        )}
      </div>

      {/* API利用量 */}
      <UsageBadge usage={structure.usage} />

      {/* スライド一覧 */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {slides.map((slide, i) => (
          <div key={i} className={`border rounded-lg p-3 bg-white ${slide.image_prompt ? 'border-blue-300' : 'border-gray-200'}`}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-gray-400 w-6 text-center">{i + 1}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColor[slide.type] ?? 'bg-gray-100 text-gray-600'}`}>
                  {SLIDE_TYPE_LABELS[slide.type] ?? slide.type}
                </span>
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                <input type="text" value={slide.title}
                  onChange={e => updateSlide(i, 'title', e.target.value)}
                  className="w-full text-sm font-semibold border-b border-gray-200 focus:border-[#1B295E] outline-none py-0.5 bg-transparent" />
                {slide.body.length > 0 && (
                  <textarea rows={Math.min(slide.body.length + 1, 4)}
                    value={slide.body.join('\n')}
                    onChange={e => updateSlide(i, 'body', e.target.value.split('\n'))}
                    className="w-full text-xs text-gray-600 border border-gray-100 rounded px-2 py-1 focus:outline-none focus:border-[#1B295E] resize-none bg-gray-50" />
                )}
                {slide.visual_hint && (
                  <p className="text-xs text-gray-400 italic">📊 {slide.visual_hint}</p>
                )}
                {slide.image_prompt && (
                  <div className="text-xs bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
                    <span className="font-semibold text-blue-700">🎨 画像プロンプト（AI画像生成用）</span>
                    <p className="text-blue-600 mt-0.5 leading-relaxed">{slide.image_prompt}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={onBack}
          className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          ← 入力に戻る
        </button>
        <button onClick={handleGenerate} disabled={loading}
          className="flex-1 bg-[#E83A3A] hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              PowerPoint を生成中…
            </>
          ) : '✅ この構成で PowerPoint を生成する'}
        </button>
      </div>
    </div>
  )
}

// ─── ステップ3: 完成 ──────────────────────────────────────────────
function DoneStep({ structure, onReset }: { structure: ProposalStructure; onReset: () => void }) {
  const imgCount = structure.slides.filter(s => s.image_prompt).length
  const costJpy  = structure.usage?.estimated_cost_usd
    ? Math.round(structure.usage.estimated_cost_usd * 150)
    : null

  return (
    <div className="text-center space-y-6 py-6">
      <div className="text-6xl">🎉</div>
      <div>
        <h2 className="text-xl font-bold text-[#1B295E] mb-2">提案書が完成しました！</h2>
        <p className="text-gray-600 text-sm">
          「<strong>{structure.proposal_title}</strong>」<br />
          ダウンロードが自動的に開始されています。
        </p>
      </div>

      {costJpy !== null && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
          💰 今回の API 利用料金: 約 <strong>{costJpy} 円</strong>
          <span className="text-xs text-gray-400 ml-1">
            （入力 {structure.usage.input_tokens.toLocaleString()} + 出力 {structure.usage.output_tokens.toLocaleString()} トークン）
          </span>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600 text-left">
        <p className="font-semibold mb-2 text-gray-700">📌 次のステップ</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>PowerPoint でグラフ・図表を追加する</li>
          {imgCount > 0 && (
            <li>
              🎨 画像プロンプト枠が <strong>{imgCount}枚</strong> あります。
              Gemini / ChatGPT にプロンプトを貼り付けて画像を生成し、差し替えてください
            </li>
          )}
          <li>スライドのデザインをブランドに合わせて調整する</li>
          <li>スピーカーノートを確認・編集する</li>
        </ul>
      </div>

      <button onClick={onReset}
        className="bg-[#1B295E] hover:bg-[#2E4FAA] text-white font-semibold px-8 py-3 rounded-lg transition-colors">
        別の提案書を作成する
      </button>
    </div>
  )
}

// ─── メインページ ─────────────────────────────────────────────────
export default function HomePage() {
  const [step, setStep]           = useState<Step>('input')
  const [structure, setStructure] = useState<ProposalStructure | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-[#1B295E] text-white shadow-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <h1 className="text-lg font-bold tracking-wide">提案書ジェネレーター</h1>
            <p className="text-xs text-blue-200">AI が与件から PowerPoint を自動生成</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <Stepper step={step} />

          {step === 'input' && (
            <InputStep onNext={s => { setStructure(s); setStep('confirm') }} />
          )}
          {step === 'confirm' && structure && (
            <ConfirmStep
              structure={structure}
              onBack={() => setStep('input')}
              onGenerate={s => { setStructure(s); setStep('done') }}
            />
          )}
          {step === 'done' && structure && (
            <DoneStep structure={structure} onReset={() => { setStructure(null); setStep('input') }} />
          )}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by Claude (Anthropic) + python-pptx
        </p>
      </main>
    </div>
  )
}
