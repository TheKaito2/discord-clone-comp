import { useEffect, useRef, useState } from 'react'
import { Plus, Smile, Send, Gift, Sticker } from 'lucide-react'

const EMOJI = ['😀', '😂', '😍', '🤔', '👍', '🎉', '🔥', '❤️', '😢', '😎', '🙏', '🚀', '✨', '👀', '💯', '🤝', '🥳', '😴', '🤯', '💀', '👋', '☕', '🍕', '🌮']

export default function Composer({
  channelName,
  onSend,
}: {
  channelName: string
  onSend: (content: string) => void | Promise<void>
}) {
  const [val, setVal] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  function submit() {
    if (!val.trim()) return
    onSend(val)
    setVal('')
    setShowEmoji(false)
  }

  function insertEmoji(e: string) {
    const ta = textareaRef.current
    if (!ta) {
      setVal((v) => v + e)
      return
    }
    const start = ta.selectionStart ?? val.length
    const end = ta.selectionEnd ?? val.length
    const next = val.slice(0, start) + e + val.slice(end)
    setVal(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + e.length
    })
  }

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowEmoji(false)
    }
    if (showEmoji) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [showEmoji])

  function onAttachFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setVal((v) => (v ? v + ' ' : '') + `📎 ${f.name}`)
    e.target.value = ''
  }

  return (
    <div className="px-4 pb-6 pt-2 relative">
      {showEmoji && (
        <div
          ref={pickerRef}
          className="absolute bottom-20 right-6 glass-panel rounded-xl p-3 shadow-elev2 w-[280px] grid grid-cols-8 gap-1 z-20 border border-divider/60 anim-scale-in"
        >
          {EMOJI.map((e) => (
            <button
              key={e}
              onClick={() => insertEmoji(e)}
              className="text-xl h-8 w-8 grid place-items-center rounded hover:bg-hover-a"
            >
              {e}
            </button>
          ))}
        </div>
      )}
      <div className="bg-[#383A40] rounded-lg flex items-end gap-2 px-3 py-2.5 transition-shadow focus-within:shadow-[0_0_0_2px_rgba(88,101,242,0.35)]">
        <input ref={fileRef} type="file" onChange={onAttachFile} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          className="text-text-sub hover:text-text-hi shrink-0 p-1"
          title="Attach a file"
        >
          <Plus size={20} />
        </button>
        <textarea
          ref={textareaRef}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          rows={1}
          placeholder={`Message #${channelName}`}
          className="flex-1 bg-transparent resize-none text-[16px] leading-[22px] text-text-body placeholder:text-text-sub outline-none max-h-40"
          style={{ minHeight: 22 }}
        />
        <button
          className="text-text-sub hover:text-text-hi shrink-0 p-1 hidden sm:block"
          title="Send a gift"
          onClick={() => insertEmoji('🎁')}
        >
          <Gift size={20} />
        </button>
        <button
          className="text-text-sub hover:text-text-hi shrink-0 px-1.5 h-7 grid place-items-center rounded font-bold text-[11px] tracking-[0.5px] hidden sm:grid"
          title="GIF"
          onClick={() => insertEmoji(' [GIF] ')}
        >
          GIF
        </button>
        <button
          className="text-text-sub hover:text-text-hi shrink-0 p-1 hidden sm:block"
          title="Stickers"
          onClick={() => insertEmoji('🌟')}
        >
          <Sticker size={20} />
        </button>
        <button
          onClick={() => setShowEmoji((v) => !v)}
          className={`shrink-0 p-1 ${showEmoji ? 'text-text-hi' : 'text-text-sub hover:text-text-hi'}`}
          title="Emoji"
        >
          <Smile size={20} />
        </button>
        <button
          onClick={submit}
          disabled={!val.trim()}
          className={`shrink-0 grid place-items-center h-8 w-8 rounded-full transition-all ${
            val.trim()
              ? 'bg-brand hover:bg-brand-hi text-white shadow-glow-brand hover:scale-105'
              : 'text-text-meta cursor-not-allowed'
          }`}
          title="Send"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
