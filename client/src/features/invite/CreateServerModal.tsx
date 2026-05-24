import { useState } from 'react'
import { X, ChevronRight, Gamepad2, Heart, GraduationCap, BookOpen, Compass, Camera } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import { api } from '../../lib/api'
import clsx from 'clsx'

type Step = 'choose' | 'customize' | 'audience' | 'invite'
type Template = 'custom' | 'gaming' | 'friends' | 'study' | 'school'

const TEMPLATES: { key: Template; label: string; icon: typeof Gamepad2; emoji: string }[] = [
  { key: 'gaming',  label: 'Gaming',       icon: Gamepad2,        emoji: '🎮' },
  { key: 'friends', label: 'Friends',      icon: Heart,           emoji: '💖' },
  { key: 'study',   label: 'Study Group',  icon: GraduationCap,   emoji: '📚' },
  { key: 'school',  label: 'School Club',  icon: BookOpen,        emoji: '🎓' },
]

export default function CreateServerModal({
  onClose,
  onOpenJoin,
}: {
  onClose: () => void
  onOpenJoin: () => void
}) {
  const me = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const nav = useNavigate()
  const [step, setStep] = useState<Step>('choose')
  const [template, setTemplate] = useState<Template>('custom')
  const [name, setName] = useState(me?.username ? `${me.username}'s server` : 'My server')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function pickTemplate(t: Template) {
    setTemplate(t)
    setStep('customize')
  }

  async function create() {
    setBusy(true)
    setErr(null)
    try {
      const { data } = await api.post('/guilds', { name: name.trim(), template })
      await qc.invalidateQueries({ queryKey: ['guilds'] })
      onClose()
      const firstText = data.channels?.find((c: { type: string }) => c.type === 'text')
      nav(firstText ? `/app/${data.id}/${firstText.id}` : `/app/${data.id}`)
    } catch (e) {
      const m = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErr(m || 'Could not create server')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] bg-bg-grad rounded-md shadow-2xl overflow-hidden text-text-hi relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-text-mute hover:text-text-hi z-10" title="Close">
          <X size={20} />
        </button>

        {step === 'choose' && <ChooseStep onPickTemplate={pickTemplate} onOpenJoin={() => { onClose(); onOpenJoin() }} />}
        {step === 'customize' && (
          <CustomizeStep
            name={name}
            setName={setName}
            onBack={() => setStep('choose')}
            onNext={() => setStep('audience')}
            template={template}
          />
        )}
        {step === 'audience' && (
          <AudienceStep
            busy={busy}
            err={err}
            onBack={() => setStep('customize')}
            onCreate={create}
          />
        )}
      </div>
    </div>
  )
}

function ChooseStep({ onPickTemplate, onOpenJoin }: { onPickTemplate: (t: Template) => void; onOpenJoin: () => void }) {
  return (
    <>
      <div className="px-6 pt-6 pb-3 text-center">
        <h2 className="text-[24px] font-bold text-text-hi leading-7">Create Your Server</h2>
        <p className="text-text-mute text-[15px] mt-2 leading-5">
          Your server is where you and your friends hang out. Make yours and start talking.
        </p>
      </div>
      <div className="px-4 pb-4">
        {/* Create My Own */}
        <button
          onClick={() => onPickTemplate('custom')}
          className="w-full flex items-center gap-3 px-4 h-[56px] bg-rail/40 hover:bg-rail/70 rounded-lg border border-divider/40 hover:border-text-mute/40 transition-colors mb-3"
        >
          <span className="text-2xl">🛠️</span>
          <span className="flex-1 text-left text-text-hi font-semibold text-[16px]">Create My Own</span>
          <ChevronRight size={20} className="text-text-mute" />
        </button>

        <div className="text-[12px] font-bold uppercase tracking-cap text-text-mute px-1 mb-2">
          Start from a template
        </div>

        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            onClick={() => onPickTemplate(t.key)}
            className="w-full flex items-center gap-3 px-4 h-[56px] bg-rail/40 hover:bg-rail/70 rounded-lg border border-divider/40 hover:border-text-mute/40 transition-colors mb-2"
          >
            <span className="text-2xl">{t.emoji}</span>
            <span className="flex-1 text-left text-text-hi font-semibold text-[16px]">{t.label}</span>
            <ChevronRight size={20} className="text-text-mute" />
          </button>
        ))}
      </div>
      <div className="bg-panel px-6 py-5 text-center">
        <h3 className="text-text-hi font-bold text-[16px]">Have an invite already?</h3>
        <button
          onClick={onOpenJoin}
          className="w-full mt-3 h-[44px] bg-[#4E5058] hover:bg-[#6D6F78] text-text-hi font-medium text-[15px] rounded transition-colors"
        >
          Join a Server
        </button>
      </div>
    </>
  )
}

function CustomizeStep({
  name,
  setName,
  template,
  onBack,
  onNext,
}: {
  name: string
  setName: (v: string) => void
  template: Template
  onBack: () => void
  onNext: () => void
}) {
  return (
    <>
      <div className="px-6 pt-6 pb-3 text-center">
        <h2 className="text-[24px] font-bold text-text-hi leading-7">Customize Your Server</h2>
        <p className="text-text-mute text-[15px] mt-2 leading-5">
          Give your new server a personality with a name and an icon. You can always change it later.
        </p>
      </div>
      <div className="px-5 pb-2">
        <div className="grid place-items-center my-2">
          <button
            className="relative w-[80px] h-[80px] rounded-full border-2 border-dashed border-text-mute text-text-mute grid place-items-center"
            title="Upload (not implemented)"
          >
            <div className="flex flex-col items-center gap-0.5">
              <Camera size={20} />
              <span className="text-[10px] font-bold uppercase tracking-cap">Upload</span>
            </div>
            <span className="absolute -top-1 -right-1 bg-brand text-white rounded-full w-6 h-6 grid place-items-center text-lg font-bold">+</span>
          </button>
        </div>
        <label className="block text-[12px] font-bold uppercase tracking-cap text-text-mute mt-3 mb-2">
          Server Name <span className="text-danger">*</span>
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          className="w-full bg-rail rounded-[3px] px-3 h-10 text-text-body outline-none focus:ring-1 focus:ring-brand text-[15px]"
        />
        <p className="text-[12px] text-text-mute mt-2">
          By creating a server, you agree to Discord's <span className="text-brand cursor-pointer hover:underline">Community Guidelines</span>.
        </p>
        <p className="text-[11px] text-text-meta mt-2">
          Template: <span className="text-text-mute capitalize">{template === 'custom' ? 'My Own' : template}</span>
        </p>
      </div>
      <div className="bg-panel px-5 py-4 flex items-center justify-between">
        <button onClick={onBack} className="text-text-hi text-[15px] hover:underline">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={name.trim().length < 2}
          className={clsx(
            'px-5 h-[38px] rounded text-white font-medium text-[14px] transition-colors',
            name.trim().length < 2 ? 'bg-brand/60 cursor-not-allowed' : 'bg-brand hover:bg-brand-hi',
          )}
        >
          Next
        </button>
      </div>
    </>
  )
}

function AudienceStep({
  busy,
  err,
  onBack,
  onCreate,
}: {
  busy: boolean
  err: string | null
  onBack: () => void
  onCreate: () => void
}) {
  return (
    <>
      <div className="px-6 pt-6 pb-3 text-center">
        <h2 className="text-[24px] font-bold text-text-hi leading-7">Tell Us More About Your Server</h2>
        <p className="text-text-mute text-[15px] mt-2 leading-5">
          In order to help you with your setup, is your new server for just a few friends or a larger community?
        </p>
      </div>
      <div className="px-4 pb-2">
        <button
          onClick={onCreate}
          disabled={busy}
          className="w-full flex items-center gap-3 px-4 h-[56px] bg-rail/40 hover:bg-rail/70 rounded-lg border border-divider/40 hover:border-text-mute/40 transition-colors mb-2 disabled:opacity-60"
        >
          <span className="text-2xl">🛋️</span>
          <span className="flex-1 text-left text-text-hi font-semibold text-[16px]">For me and my friends</span>
          <ChevronRight size={20} className="text-text-mute" />
        </button>
        <button
          onClick={onCreate}
          disabled={busy}
          className="w-full flex items-center gap-3 px-4 h-[56px] bg-rail/40 hover:bg-rail/70 rounded-lg border border-divider/40 hover:border-text-mute/40 transition-colors disabled:opacity-60"
        >
          <Compass size={24} className="text-online" />
          <span className="flex-1 text-left text-text-hi font-semibold text-[16px]">For a club or community</span>
          <ChevronRight size={20} className="text-text-mute" />
        </button>
        {err && <div className="text-danger text-sm mt-3 text-center">{err}</div>}
        <p className="text-text-mute text-[13px] text-center mt-4 mb-2">
          Not sure? You can <button onClick={onCreate} disabled={busy} className="text-brand hover:underline">skip this question</button> for now.
        </p>
      </div>
      <div className="bg-panel px-5 py-4 flex items-center justify-start">
        <button onClick={onBack} className="text-text-hi text-[15px] hover:underline" disabled={busy}>
          Back
        </button>
      </div>
    </>
  )
}
