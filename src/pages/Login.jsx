import { useState } from 'react'
import { supabase } from '../services/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [showReset, setShowReset] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMensaje('')

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
    }

    setLoading(false)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMensaje('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })

    if (error) {
      setError(error.message)
    } else {
      setMensaje('Te enviamos un enlace para restablecer tu contraseña')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg)]">

      {/* ── Brand panel ── */}
      <div className="relative flex flex-col items-center justify-center bg-[var(--brand)] px-8 py-16 lg:py-0 lg:w-[45%] overflow-hidden">

        <svg
          className="absolute inset-0 h-full w-full opacity-[0.07]"
          aria-hidden="true"
        >
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <div className="pointer-events-none absolute -right-24 -top-24 h-[520px] w-[520px] rounded-full bg-white/[0.05]" />
        <div className="pointer-events-none absolute -left-16 -bottom-32 h-[360px] w-[360px] rounded-full bg-white/[0.04]" />

        <div className="relative z-10 text-center lg:text-left">
          <h1 className="text-5xl font-semibold tracking-tight text-white">
            danpa
          </h1>
          <p className="mt-4 max-w-xs text-base leading-relaxed text-white/70 mx-auto lg:mx-0">
            Sistema de pedidos para corredores
          </p>
        </div>

        <p className="relative z-10 mt-auto pt-12 text-xs font-medium tracking-wide text-white/30 uppercase">
          v1.0
        </p>
      </div>

      {/* ── Form panel ── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-[400px]">

          <div className="mb-10 text-center lg:hidden">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink-primary)]">
              danpa
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-secondary)]">
              Sistema de pedidos para corredores
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--ink-primary)]">
              {showReset ? 'Restablecer contraseña' : 'Iniciar sesión'}
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-secondary)]">
              {showReset
                ? 'Ingresa tu email para recibir el enlace'
                : 'Bienvenido de vuelta'}
            </p>

            <form onSubmit={showReset ? handleResetPassword : handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--ink-primary)]">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="correo@ejemplo.com"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--ink-primary)] placeholder-[var(--ink-muted)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                />
              </div>



              {error && (
                <div className="rounded-lg bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
                  {error}
                </div>
              )}

              {mensaje && (
                <div className="rounded-lg bg-[var(--success-bg)] px-4 py-3 text-sm" style={{ color: 'var(--success-text)' }}>
                  {mensaje}
                </div>
              )}

              {!showReset && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--ink-primary)]">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--ink-primary)] placeholder-[var(--ink-muted)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-hover)] disabled:opacity-50"
              >
                {loading ? 'Cargando...' : showReset ? 'Enviar enlace' : 'Iniciar Sesión'}
              </button>
            </form>
          </div>

          {!showReset && (
            <div className="mt-6 text-center space-y-3">
              <button
                onClick={() => { setShowReset(true); setError(''); setMensaje('') }}
                className="text-sm font-medium text-[var(--brand)] transition hover:text-[var(--brand-hover)]"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          {showReset && (
            <div className="mt-6 text-center">
              <button
                onClick={() => { setShowReset(false); setError(''); setMensaje('') }}
                className="text-sm font-medium text-[var(--brand)] transition hover:text-[var(--brand-hover)]"
              >
                Volver al inicio de sesión
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
