import { useState } from 'react'
import { Plus, Smile, Send } from 'lucide-react'

export default function Composer({
  channelName,
  onSend,
}: {
  channelName: string
  onSend: (content: string) => void | Promise<void>
}) {
  const [val, setVal] = useState('')

  function submit() {
    if (!val.trim()) return
    onSend(val)
    setVal('')
  }

  return (
    <div className="px-4 pb-6 pt-2">
      <div className="bg-[#383A40] rounded-lg flex items-end gap-2 px-3 py-2.5">
        <button className="text-text-sub hover:text-text-hi shrink-0 p-1" title="Attach">
          <Plus size={20} />
        </button>
        <textarea
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
        <button className="text-text-sub hover:text-text-hi shrink-0 p-1" title="Emoji">
          <Smile size={20} />
        </button>
        <button onClick={submit} className="text-brand hover:text-brand-hi shrink-0 p-1" title="Send">
          <Send size={20} />
        </button>
      </div>
    </div>
  )
}
