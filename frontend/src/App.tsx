import { useMemo, useState } from 'react'
import { createClient, type ChatClient } from './api/client'
import type { AuthResponse, AuthUser } from './api/types'
import { useAuth } from './hooks/useAuth'
import { useChat } from './hooks/useChat'
import { useMemoryFeed } from './hooks/useMemoryFeed'
import { useToasts } from './hooks/useToasts'
import AuthScreen, { type AuthMode } from './components/AuthScreen'
import ChatPane from './components/ChatPane'
import MemoryPanel from './components/MemoryPanel'
import SimulationsDock from './components/SimulationsDock'
import Toasts from './components/Toasts'
import Brand from './components/Brand'

/**
 * RecallOS — single-page demo app. No router: unauthenticated → AuthScreen,
 * authenticated → the chat + memory panel workspace.
 */
export default function App() {
  const auth = useAuth()
  // Guest client for the login/register calls (no token yet).
  const guestClient = useMemo(() => createClient(null), [])

  const handleAuthSubmit = async (
    mode: AuthMode,
    fields: { name: string; email: string; password: string },
  ) => {
    const resp: AuthResponse =
      mode === 'login'
        ? await guestClient.login(fields.email, fields.password)
        : await guestClient.register(fields.name, fields.email, fields.password)
    auth.applyAuth(resp)
  }

  if (!auth.token || !auth.user) {
    return <AuthScreen onSubmit={handleAuthSubmit} />
  }

  return <Workspace key={auth.user.id} user={auth.user} token={auth.token} logout={auth.logout} />
}

/** Workspace is refreshed per login so chat/feed state never leaks across users. */
function Workspace({ user, token, logout }: { user: AuthUser; token: string | null; logout: () => void }) {
  const client: ChatClient = useMemo(() => createClient(token), [token])
  const chat = useChat(client)
  const feed = useMemoryFeed(client, token)
  const toasts = useToasts()
  const [dockOpen, setDockOpen] = useState(false)
  const [mobileMemory, setMobileMemory] = useState(false)

  return (
    <div className="workspace flex h-screen flex-col overflow-hidden text-slate-200">
      {/* top bar */}
      <header className="workspace-header">
        <div className="flex items-center gap-2">
          <Brand />
          <span className="ml-1 hidden rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-violet-300 sm:inline">
            THE STUDY SPACE
          </span>
          {user.memory_paused && (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-amber-300">
              memory paused
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs text-slate-400">{user.name || user.email}</span>
          <button
            onClick={logout}
            title="Sign out (memory stays — it's yours)"
            className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-rose-500/40 hover:text-rose-300"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* main: 2/3 chat, 1/3 memory panel */}
      <div className="workspace-toolbar"><div><span className="section-label">YOUR WORKSPACE</span><h1>A little more you, every session.</h1></div><div className="workspace-actions"><button onClick={chat.newSession} disabled={chat.thinking || chat.comparing}>＋ New session</button><button className="mobile-memory-toggle" aria-pressed={mobileMemory} onClick={() => setMobileMemory(v => !v)}>{mobileMemory ? 'Back to chat' : 'Your memory'}</button></div></div>
      <div className="workspace-body flex min-h-0 flex-1">
        <div className={`conversation-shell ${mobileMemory ? 'mobile-hidden' : ''}`}>
          <div className="panel-heading"><span><i className="status-dot" /> Study companion</span><span>CONVERSATION</span></div>
          <ChatPane client={client} chat={chat} toasts={toasts} refreshMemory={feed.refresh} />
        </div>
        <aside className={`memory-shell ${mobileMemory ? 'mobile-visible' : ''}`}>
          <MemoryPanel client={client} feed={feed} toasts={toasts} user={{ email: user.email }} />
        </aside>
      </div>

      <SimulationsDock
        client={client}
        chat={chat}
        toasts={toasts}
        open={dockOpen}
        setOpen={setDockOpen}
        onDone={feed.refresh}
      />
      <Toasts toasts={toasts.toasts} dismiss={toasts.dismiss} />
    </div>
  )
}
