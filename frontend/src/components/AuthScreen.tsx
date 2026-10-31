import { useState } from 'react'
import Brand from './Brand'

export type AuthMode = 'login' | 'register'

export interface AuthScreenProps {
  onSubmit: (
    mode: AuthMode,
    fields: { name: string; email: string; password: string },
  ) => Promise<void>
}

/**
 * Single card with Login/Register toggle — the only screen shown while
 * unauthenticated.
 */
export default function AuthScreen({ onSubmit }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit(mode, { name: name.trim(), email: email.trim(), password })
    } catch (err) {
      setError(err instanceof Error ? err.message : ' authentication failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-header"><Brand /><span className="eyebrow">A little context. A better tomorrow.</span></header>
      <main className="auth-layout">
      <section className="auth-story">
        <span className="section-label"><i /> YOUR PERSONAL STUDY COMPANION</span>
        <h1>Pick up where<br />your mind<br /> <em>left off.</em></h1>
        <p className="auth-description">Your goals, your rhythm, your way of learning. A study assistant that remembers what matters, so you can focus on what’s next.</p>
        <div className="memory-preview" aria-label="Example of how memory works">
          <div className="preview-heading"><span className="mini-orbit">✳</span><span>A little memory goes a long way</span><span className="example-tag">EXAMPLE</span></div>
          <div className="preview-message">“I learn best in short morning sessions.”</div>
          <div className="preview-connector"><span />Remembered for next time</div>
          <div className="preview-result"><span>↳</span><p>Let’s start with a focused 20-minute<br /><strong>MongoDB session at 8:30 AM.</strong></p></div>
        </div>
        <div className="auth-principles"><span>01 <b>Tell it once</b></span><span>02 <b>Build on it</b></span><span>03 <b>Stay in control</b></span></div>
      </section>

      <form
        onSubmit={submit}
        className="auth-form space-y-5"
      >
        <div className="space-y-2">
          <span className="section-label">YOUR NEXT CHAPTER</span>
          <h2 className="auth-form-title">{mode === 'login' ? 'Welcome back.' : 'Make room to grow.'}</h2>
          <p className="text-sm leading-relaxed text-slate-400">{mode === 'login' ? 'Your learning journey continues here.' : 'Start with a clean slate. Build a memory that’s yours.'}</p>
        </div>

        <div className="flex rounded-xl bg-slate-800/70 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 cursor-pointer rounded-lg px-3 py-1.5 font-medium transition ${
              mode === 'login' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 cursor-pointer rounded-lg px-3 py-1.5 font-medium transition ${
              mode === 'register' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create account
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        )}

        {mode === 'register' && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm placeholder-slate-600 focus:border-violet-400 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full cursor-pointer rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? 'Opening your workspace…' : mode === 'login' ? 'Enter your workspace →' : 'Start your journey →'}
        </button>

        <p className="auth-privacy">
          <span aria-hidden="true">◇</span> Your memory, your rules. Inspect, correct, or forget what your assistant remembers.
        </p>
      </form>
      </main>
      <footer className="auth-footer"><span>Built for the way you learn.</span><span>PERSISTENT MEMORY · POWERED BY MONGODB</span></footer>
    </div>
  )
}
