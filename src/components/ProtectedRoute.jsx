import { Link } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext'

export default function ProtectedRoute({ permission, children }) {
  const { hasPermission, loading } = useProfile()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2" style={{ borderColor: 'var(--surface-2)', borderTopColor: 'var(--brand)' }} />
      </div>
    )
  }

  if (!hasPermission(permission)) {
    return (
      <div className="text-center py-20">
        <p className="text-6xl mb-4">🔒</p>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--ink-primary)' }}>Acceso restringido</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--ink-secondary)' }}>
          No tienes permiso para acceder a esta sección
        </p>
        <Link
          to="/"
          className="inline-block mt-4 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition"
          style={{ background: 'var(--brand)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--brand)'}
        >
          Volver al catálogo
        </Link>
      </div>
    )
  }

  return children
}
