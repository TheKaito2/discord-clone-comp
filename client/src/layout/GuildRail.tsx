import { Link, useParams } from 'react-router-dom'
import { Plus, Home } from 'lucide-react'
import clsx from 'clsx'
import type { Guild } from '../lib/queries'

export default function GuildRail({
  guilds,
  onJoinClick,
}: {
  guilds: Guild[]
  onJoinClick: () => void
}) {
  const { guildId } = useParams()

  return (
    <aside className="w-rail bg-rail flex flex-col items-center pt-3 gap-2 shrink-0">
      <Link to="/app" className={clsx('rail-item bg-brand', !guildId && 'rounded-2xl')}>
        <Home size={20} />
      </Link>
      <div className="w-8 h-0.5 rounded-full bg-divider/60 my-1" />
      {guilds.map((g) => {
        const active = guildId === g.id
        return (
          <Link
            key={g.id}
            to={`/app/${g.id}`}
            className={clsx('rail-item group', active && 'active')}
            title={g.name}
          >
            {/* selected pip */}
            <span
              className={clsx(
                'absolute left-[-12px] w-1 rounded-r-full bg-text-hi transition-all',
                active ? 'h-10' : 'h-2 opacity-0 group-hover:opacity-100 group-hover:h-5',
              )}
            />
            <span className="text-sm font-semibold tracking-wide">
              {g.name
                .split(/[\s-]+/)
                .map((w) => w[0]?.toUpperCase())
                .slice(0, 2)
                .join('')}
            </span>
          </Link>
        )
      })}
      <button
        onClick={onJoinClick}
        className="rail-item bg-panel text-online hover:bg-online hover:text-white"
        title="Join server with invite code"
      >
        <Plus size={20} />
      </button>
    </aside>
  )
}
