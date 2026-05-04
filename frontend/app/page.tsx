'use client'

import { useState } from 'react'

// ─── 型定義 ───────────────────────────────────────────────────────
type SlideType = 'title' | 'section' | 'toc' | 'content' | 'closing'

interface Slide {
  type: SlideType
  title: string
  body: string[]
  notes: string
  visual_hint: string
}

interface ProposalStructure {
  client_name: string
  proposal_title: string
  date: string
  author: string
  slides: Slide[]
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
            ${step === s.key
              ? 'bg-[#1B295E] text-white shadow'
              : 'bg-gray-200 text-gray-500'}`}>
            {s.label}
          </div>
          {i < steps.length - 1 && (
            <div className="w-8 h-0.5 bg-gray-300 mx-1" />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── ステップ1: 入力フォーム ─────────────────────────────────────
function InputStep({
  onNext,
}: {
  onNext: (structure: ProposalStructure) => void
}) {
  const [form, setForm] = useState({
    client_name:  '',
    category:     'general',
    requirements: '',
    date:         '',
    author:       '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.client_name.trim() || !form.requirements.trim()) {
      setError('クライアント名と要件・背景は必須です')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/generate-structure`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(detail.detail ?? `エラー: ${res.status}`)
      }
      const data = await res.json()
      onNext(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* クライアント名 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          クライアント名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="例: 株式会社〇〇"
          value={form.client_name}
          onChange={e => setForm({ ...form, client_name: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B295E]"
        />
      </div>

      {/* カテゴリ */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          提案カテゴリ
        </label>
        <select
          value={form.category}
          onChange={e => setForm({ ...form, category: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B295E] bg-white"
        >
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* 要件・背景 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          要件・背景・課題 <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={6}
          placeholder="例: ECサイトのセッション数が前年比30%減少しており、SEO施策と広告運用の見直しを依頼された。予算は月50万円で、3ヶ月後にCV数を2倍にすることが目標。"
          value={form.requirements}
          onChange={e => setForm({ ...form, requirements: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B295E] resize-none"
        />
      </div>

      {/* 日付・作成者 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            日付
          </label>
          <input
            type="text"
            placeholder="例: 2026年5月"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B295E]"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            作成者・会社名
          </label>
          <input
            type="text"
            placeholder="例: 株式会社△△"
            value={form.author}
            onChange={e => setForm({ ...form, author: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B295E]"
          />
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#1B295E] hover:bg-[#2E4FAA] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            AIがスライド構成を生成中…
          </>
        ) : (
          'スライド構成を生成する →'
        )}
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

  const updateSlide = (i: number, key: keyof Slide, value: string | string[]) => {
    setSlides(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: value } : s))
  }

  const handleGenerate = async () => {
    setError('')
    setLoading(true)
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

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
        <strong>{structure.proposal_title}</strong><br />
        <span className="text-blue-600">スライド数: {slides.length}枚　タイトルや箇条書きを直接編集できます</span>
      </div>

      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
        {slides.map((slide, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-3 bg-white">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-gray-400 w-6 text-center">{i + 1}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColor[slide.type] ?? 'bg-gray-100 text-gray-600'}`}>
                  {SLIDE_TYPE_LABELS[slide.type] ?? slide.type}
                </span>
              </div>
              <div className="flex-1 space-y-1.5 min-w-0">
                <input
                  type="text"
                  value={slide.title}
                  onChange={e => updateSlide(i, 'title', e.target.value)}
                  className="w-full text-sm font-semibold border-b border-gray-200 focus:border-[#1B295E] outline-none py-0.5 bg-transparent"
                />
                {slide.body.length > 0 && (
                  <textarea
                    rows={Math.min(slide.body.length + 1, 4)}
                    value={slide.body.join('\n')}
                    onChange={e => updateSlide(i, 'body', e.target.value.split('\n'))}
                    className="w-full text-xs text-gray-600 border border-gray-100 rounded px-2 py-1 focus:outline-none focus:border-[#1B295E] resize-none bg-gray-50"
                  />
                )}
                {slide.visual_hint && (
                  <p className="text-xs text-gray-400 italic">📊 {slide.visual_hint}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          ← 入力に戻る
        </button>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex-1 bg-[#E83A3A] hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              PowerPoint を生成中…
            </>
          ) : (
            '✅ この構成で PowerPoint を生成する'
          )}
        </button>
      </div>
    </div>
  )
}

// ─── ステップ3: 完成 ──────────────────────────────────────────────
function DoneStep({
  structure,
  onReset,
}: {
  structure: ProposalStructure
  onReset: () => void
}) {
  return (
    <div className="text-center space-y-6 py-6">
      <div className="text-6xl">🎉</div>
      <div>
        <h2 className="text-xl font-bold text-[#1B295E] mb-2">提案書が完成しました！</h2>
        <p className="text-gray-600 text-sm">
          「<strong>{structure.proposal_title}</strong>」<br />
          ダウンロードが自動的に開始されています。<br />
          ダウンロードされない場合はブラウザの設定をご確認ください。
        </p>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600 text-left">
        <p className="font-semibold mb-2 text-gray-700">📌 次のステップ</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>PowerPoint でグラフ・図表を追加する</li>
          <li>スライドのデザインをブランドに合わせて調整する</li>
          <li>スピーカーノートを確認・編集する</li>
        </ul>
      </div>
      <button
        onClick={onReset}
        className="bg-[#1B295E] hover:bg-[#2E4FAA] text-white font-semibold px-8 py-3 rounded-lg transition-colors"
      >
        別の提案書を作成する
      </button>
    </div>
  )
}

// ─── メインページ ─────────────────────────────────────────────────
export default function HomePage() {
  const [step, setStep]           = useState<Step>('input')
  const [structure, setStructure] = useState<ProposalStructure | null>(null)

  const handleStructureReady = (s: ProposalStructure) => {
    setStructure(s)
    setStep('confirm')
  }

  const handleGenerated = (s: ProposalStructure) => {
    setStructure(s)
    setStep('done')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* ヘッダー */}
      <header className="bg-[#1B295E] text-white shadow-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <h1 className="text-lg font-bold tracking-wide">提案書ジェネレーター</h1>
            <p className="text-xs text-blue-200">AI が与件から PowerPoint を自動生成</p>
          </div>
        </div>
      </header>

      {/* メインカード */}
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <Stepper step={step} />

          {step === 'input' && (
            <InputStep onNext={handleStructureReady} />
          )}

          {step === 'confirm' && structure && (
            <ConfirmStep
              structure={structure}
              onBack={() => setStep('input')}
              onGenerate={handleGenerated}
            />
          )}

          {step === 'done' && structure && (
            <DoneStep
              structure={structure}
              onReset={() => {
                setStructure(null)
                setStep('input')
              }}
            />
          )}
        </div>

        {/* フッター */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by Claude (Anthropic) + python-pptx
        </p>
      </main>
    </div>
  )
}
