import { Link, useMatch } from 'react-router-dom'
import { Plus, Home, Compass } from 'lucide-react'
import clsx from 'clsx'
import type { Guild } from '../lib/queries'

export default function GuildRail({
  guilds,
  onJoinClick,
}: {
  guilds: Guild[]
  onJoinClick: () => void
}) {
  const matchHome = useMatch('/app/home')
  const matchDiscover = useMatch('/app/discover')
  const matchGuild = useMatch('/app/:guildId/*')
  const guildId = matchGuild?.params?.guildId
  const isReservedGuild = guildId === 'home' || guildId === 'discover'
  const activeGuildId = !isReservedGuild ? guildId : undefined

  return (
    <aside className="w-rail bg-rail flex flex-col items-center pt-3 gap-2 shrink-0 h-full">
      <Link
        to="/app/home"
        className={clsx(
          'rail-item group',
          matchHome ? 'rounded-2xl bg-brand text-white' : 'bg-panel text-mention hover:rounded-2xl hover:bg-brand hover:text-white',
        )}
        title="Friends"
      >
        <span
          className={clsx(
            'absolute left-[-12px] w-1 rounded-r-full bg-text-hi transition-all',
            matchHome ? 'h-10' : 'h-2 opacity-0 group-hover:opacity-100 group-hover:h-5',
          )}
        />
        <Home size={20} />
      </Link>
      <div className="w-8 h-0.5 rounded-full bg-divider/60 my-1" />
      {guilds.map((g) => {
        const active = activeGuildId === g.id
        return (
          <Link
            key={g.id}
            to={`/app/${g.id}`}
            className={clsx('rail-item group', active && 'active')}
            title={g.name}
          >
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
      <Link
        to="/app/discover"
        className={clsx(
          'rail-item group mt-1',
          matchDiscover ? 'rounded-2xl bg-online text-white' : 'bg-panel text-online hover:rounded-2xl hover:bg-online hover:text-white',
        )}
        title="Explore Discoverable Servers"
      >
        <span
          className={clsx(
            'absolute left-[-12px] w-1 rounded-r-full bg-text-hi transition-all',
            matchDiscover ? 'h-10' : 'h-2 opacity-0 group-hover:opacity-100 group-hover:h-5',
          )}
        />
        <Compass size={20} />
      </Link>
    </aside>
  )
}
