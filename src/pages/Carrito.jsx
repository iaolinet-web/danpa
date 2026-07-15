import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { supabase } from '../services/supabase'

export default function Carrito() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart()
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState('')
  const [cargandoClientes, setCargandoClientes] = useState(true)

  useEffect(() => {
    const cargarClientes = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('clientes')
        .select('id, nombre')
        .eq('corredor_id', user.id)
        .order('nombre')
      setClientes(data || [])
      setCargandoClientes(false)
    }
    cargarClientes()
  }, [])

  const handleConfirmar = async () => {
    if (!clienteId || items.length === 0) return

    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          corredor_id: user.id,
          cliente_id: clienteId,
          total,
          notas,
          estado: 'Pendiente'
        })
        .select()
        .single()

      if (pedidoError) throw new Error('Error al crear el pedido: ' + pedidoError.message)

      const itemsToInsert = items.map(item => ({
        pedido_id: pedido.id,
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio
      }))

      const { error: itemsError } = await supabase.from('pedido_items').insert(itemsToInsert)

      if (itemsError) {
        await supabase.from('pedidos').delete().eq('id', pedido.id)
        throw new Error('Error al guardar los items del pedido: ' + itemsError.message)
      }

      clearCart()
      setClienteId('')
      setNotas('')
      setExito(true)
      setLoading(false)
      setTimeout(() => { setExito(false); navigate('/pedidos') }, 2000)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (items.length === 0 && !exito) {
    return (
      <div className="max-w-lg mx-auto text-center pt-24 px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--surface)] mb-6">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
        </div>
        <h2 className="text-[22px] font-semibold text-[var(--ink-primary)] tracking-[-0.02em]">
          Tu carrito está vacío
        </h2>
        <p className="text-[var(--ink-muted)] mt-2 text-[15px]">
          Agregá productos desde el catálogo para armar tu pedido.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white font-semibold text-[15px] rounded-lg transition-colors duration-150"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
          Ver catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {exito && (
        <div className="bg-[var(--brand-light)] border border-[var(--brand)] rounded-xl p-6 mb-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--brand)] mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="font-semibold text-[var(--brand)] text-lg">¡Pedido confirmado!</p>
          <p className="text-[var(--ink-secondary)] text-sm mt-1">Redirigiendo a tus pedidos...</p>
        </div>
      )}

      {error && (
        <div className="bg-[var(--danger-bg)] border border-[var(--danger)] rounded-xl p-4 mb-6">
          <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      )}

      <h1 className="text-[22px] font-semibold text-[var(--ink-primary)] tracking-[-0.02em] mb-6">
        Tu Carrito
      </h1>

      <div className="space-y-3">
        {items.map(item => (
          <div
            key={item.id}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[var(--ink-primary)] text-[15px] truncate">
                {item.nombre}
              </h3>
              <p className="text-[var(--brand)] font-semibold text-sm tabular-nums mt-0.5">
                ${item.precio.toFixed(2)}
              </p>
            </div>

            <div className="flex items-center bg-[var(--surface-2)] rounded-lg shrink-0">
              <button
                onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                className="w-9 h-9 flex items-center justify-center text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors duration-150 rounded-l-lg"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <span className="w-9 text-center text-sm font-semibold text-[var(--ink-primary)] tabular-nums select-none">
                {item.cantidad}
              </span>
              <button
                onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                disabled={item.stock != null && item.cantidad >= item.stock}
                className="w-9 h-9 flex items-center justify-center text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors duration-150 rounded-r-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            <p className="font-semibold text-[var(--ink-primary)] text-sm tabular-nums w-20 text-right shrink-0">
              ${(item.precio * item.cantidad).toFixed(2)}
            </p>

            <button
              onClick={() => removeItem(item.id)}
              className="w-8 h-8 flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--danger)] hover:bg-[rgba(193,41,46,0.06)] rounded-lg transition-all duration-150 shrink-0"
              aria-label="Eliminar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mt-6">
        <div className="flex justify-end items-baseline mb-6">
          <span className="text-[var(--ink-secondary)] text-[15px] mr-3">Total</span>
          <span className="text-2xl font-semibold text-[var(--brand)] tabular-nums tracking-[-0.02em]">
            ${total.toFixed(2)}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-1.5">
              Cliente
            </label>
            {cargandoClientes ? (
              <div className="flex items-center gap-2 text-sm text-[var(--ink-muted)] py-3">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Cargando clientes...
              </div>
            ) : (
              <select
                value={clienteId}
                onChange={e => setClienteId(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--ink-primary)] text-[15px] focus:outline-none focus:ring-2 focus:ring-[rgba(45,106,79,0.25)] focus:border-[var(--brand)] appearance-none transition-all duration-150"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b6560' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '16px',
                }}
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-1.5">
              Notas <span className="text-[var(--ink-muted)]">(opcional)</span>
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--ink-primary)] text-[15px] placeholder-[var(--ink-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(45,106,79,0.25)] focus:border-[var(--brand)] transition-all duration-150"
              placeholder="Instrucciones especiales..."
            />
          </div>

          <button
            onClick={handleConfirmar}
            disabled={loading || !clienteId}
            className="w-full py-3.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white font-bold text-[15px] rounded-lg transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--brand)]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Confirmando...
              </span>
            ) : (
              'Confirmar Pedido'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
