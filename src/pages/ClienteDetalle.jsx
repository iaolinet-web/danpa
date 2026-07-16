import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

const TIPOS_CLIENTE = {
  general: { label: 'General', color: 'var(--ink-secondary)' },
  frecuente: { label: 'Frecuente', color: 'var(--brand)' },
  nuevo: { label: 'Nuevo', color: 'var(--success-text)' },
  vip: { label: 'VIP', color: 'var(--warning-text)' },
  moroso: { label: 'Moroso', color: 'var(--danger)' },
  inactivo: { label: 'Inactivo', color: 'var(--ink-muted)' },
}

export default function ClienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState(null)
  const [pedidos, setPedidos] = useState([])
  const [detalles, setDetalles] = useState({})
  const [expandido, setExpandido] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notas, setNotas] = useState([])
  const [nuevaNota, setNuevaNota] = useState('')
  const [showNotas, setShowNotas] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) return

        const { data: cli } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', id)
          .eq('corredor_id', user.id)
          .single()

        if (!cli || cancelled) {
          navigate('/clientes')
          return
        }

        setCliente(cli)

        const { data: ped } = await supabase
          .from('pedidos')
          .select('*')
          .eq('cliente_id', id)
          .eq('corredor_id', user.id)
          .order('created_at', { ascending: false })

        if (!cancelled) setPedidos(ped || [])

        const { data: notasData } = await supabase
          .from('cliente_notas')
          .select('*')
          .eq('cliente_id', id)
          .order('created_at', { ascending: false })

        if (!cancelled) {
          setNotas(notasData || [])
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, navigate])

  const fetchDetalle = async (pedidoId) => {
    if (detalles[pedidoId]) return
    const { data } = await supabase
      .from('pedido_items')
      .select('*, productos(nombre)')
      .eq('pedido_id', pedidoId)
    setDetalles(prev => ({ ...prev, [pedidoId]: data || [] }))
  }

  const toggleExpand = async (pedidoId) => {
    if (expandido === pedidoId) {
      setExpandido(null)
    } else {
      setExpandido(pedidoId)
      await fetchDetalle(pedidoId)
    }
  }

  const handleAddNota = async (e) => {
    e.preventDefault()
    if (!nuevaNota.trim()) return
    try {
      const { data: { user } } = await supabase.auth.getUser()

      await supabase.from('cliente_notas').insert({
        cliente_id: id,
        corredor_id: user.id,
        nota: nuevaNota.trim(),
      })

      setNuevaNota('')
      const { data: notasData } = await supabase
        .from('cliente_notas')
        .select('*')
        .eq('cliente_id', id)
        .order('created_at', { ascending: false })
      setNotas(notasData || [])
    } catch (err) {
      alert('Error al agregar nota: ' + err.message)
    }
  }

  const handleWhatsApp = () => {
    if (!cliente?.telefono) return
    const tel = cliente.telefono.replace(/[^0-9+]/g, '')
    window.open(`https://wa.me/${tel.startsWith('+') ? tel.substring(1) : tel}`, '_blank')
  }

  const handleLlamar = () => {
    if (!cliente?.telefono) return
    window.open(`tel:${cliente.telefono}`, '_blank')
  }

  const stats = {
    totalPedidos: pedidos.length,
    montoTotal: pedidos.reduce((sum, p) => sum + (p.total || 0), 0),
    promedio: pedidos.length > 0 ? pedidos.reduce((sum, p) => sum + (p.total || 0), 0) / pedidos.length : 0,
    ultimoPedido: pedidos.length > 0 ? pedidos[0].created_at : null,
    pedidosPendientes: pedidos.filter(p => p.estado === 'Pendiente').length,
    pedidosEntregados: pedidos.filter(p => p.estado === 'Entregado').length,
  }

  const estadoColor = (estado) => {
    switch (estado) {
      case 'Pendiente': return 'bg-[var(--warning-bg)] text-[var(--warning-text)]'
      case 'En camino': return 'bg-[var(--brand-light)] text-[var(--brand)]'
      case 'Entregado': return 'bg-[var(--success-bg)] text-[var(--success-text)]'
      default: return 'bg-[var(--surface-2)] text-[var(--ink-secondary)]'
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-[var(--surface-2)] rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 bg-[var(--surface)] border border-[var(--border)] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const tipoInfo = TIPOS_CLIENTE[cliente?.tipo_cliente] || TIPOS_CLIENTE.general

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/clientes')}
        className="flex items-center gap-1 text-sm text-[var(--ink-secondary)] hover:text-[var(--brand)] font-medium mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Volver a clientes
      </button>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink-primary)]">{cliente?.nombre}</h1>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider"
                style={{ background: `${tipoInfo.color}20`, color: tipoInfo.color }}
              >
                {tipoInfo.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-[var(--ink-secondary)]">
              {cliente?.telefono && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[var(--ink-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  <span>{cliente.telefono}</span>
                </div>
              )}
              {cliente?.direccion && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[var(--ink-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <span>{cliente.direccion}</span>
                </div>
              )}
            </div>
            {cliente?.notas && (
              <p className="text-[var(--ink-muted)] text-sm italic mt-3">{cliente.notas}</p>
            )}
          </div>

          {cliente?.telefono && (
            <div className="flex gap-2">
              <button
                onClick={handleLlamar}
                className="px-3 py-2 bg-[var(--surface-2)] hover:bg-[var(--hover-subtle)] text-[var(--ink-secondary)] rounded-lg transition-colors duration-150 flex items-center gap-1.5 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                Llamar
              </button>
              <button
                onClick={handleWhatsApp}
                className="px-3 py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-lg transition-colors duration-150 flex items-center gap-1.5 text-sm font-medium"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[var(--ink-primary)]">{stats.totalPedidos}</p>
          <p className="text-xs text-[var(--ink-secondary)] mt-1">Pedidos totales</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[var(--brand)]">${stats.montoTotal.toFixed(2)}</p>
          <p className="text-xs text-[var(--ink-secondary)] mt-1">Monto total</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[var(--ink-primary)]">${stats.promedio.toFixed(2)}</p>
          <p className="text-xs text-[var(--ink-secondary)] mt-1">Promedio/pedido</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-[var(--ink-primary)]">
            {stats.ultimoPedido
              ? new Date(stats.ultimoPedido).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'N/A'}
          </p>
          <p className="text-xs text-[var(--ink-secondary)] mt-1">Último pedido</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[var(--warning-text)]">{stats.pedidosPendientes}</p>
          <p className="text-xs text-[var(--ink-secondary)] mt-1">Pendientes</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[var(--success-text)]">{stats.pedidosEntregados}</p>
          <p className="text-xs text-[var(--ink-secondary)] mt-1">Entregados</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowNotas(!showNotas)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showNotas
              ? 'bg-[var(--brand)] text-white'
              : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
          }`}
        >
          Notas ({notas.length})
        </button>
      </div>

      {showNotas && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-[var(--ink-primary)] mb-4">Historial de Interacciones</h3>
          <form onSubmit={handleAddNota} className="flex gap-2 mb-4">
            <input
              type="text"
              value={nuevaNota}
              onChange={e => setNuevaNota(e.target.value)}
              placeholder="Agregar nota (ej: '14-jul: cliente solicito cambio de horario')"
              className="flex-1 px-3.5 py-2.5 text-sm text-[var(--ink-primary)] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] transition-colors duration-150 placeholder:text-[var(--ink-muted)]"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-sm font-medium rounded-lg transition-colors duration-150"
            >
              Agregar
            </button>
          </form>
          {notas.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)] text-center py-4">Sin interacciones registradas</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notas.map(nota => (
                <div key={nota.id} className="flex gap-3 p-3 bg-[var(--surface-2)] rounded-lg">
                  <div className="text-[10px] text-[var(--ink-muted)] whitespace-nowrap mt-0.5">
                    {new Date(nota.created_at).toLocaleDateString('es-PE', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                  <p className="text-sm text-[var(--ink-primary)]">{nota.nota}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <h2 className="text-lg font-semibold text-[var(--ink-primary)] mb-4">Historial de Pedidos</h2>

      {pedidos.length === 0 ? (
        <div className="text-center py-12 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
          <p className="text-[var(--ink-muted)]">Este cliente no tiene pedidos aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map(pedido => (
            <div key={pedido.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div
                onClick={() => toggleExpand(pedido.id)}
                className="p-4 cursor-pointer hover:bg-[var(--surface-2)] transition-colors duration-150"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-[var(--ink-muted)] font-medium tabular-nums">
                      {new Date(pedido.created_at).toLocaleDateString('es-PE', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoColor(pedido.estado)}`}>
                      {pedido.estado}
                    </span>
                    <p className="text-lg font-bold text-[var(--brand)] tabular-nums">
                      ${pedido.total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {expandido === pedido.id && (
                <div className="border-t border-[var(--border-subtle)] px-4 pb-4">
                  <p className="text-[10px] font-medium text-[var(--ink-muted)] uppercase tracking-wider mt-3 mb-2">Detalle</p>
                  {(detalles[pedido.id] || []).map(item => (
                    <div key={item.id} className="flex justify-between py-2 text-sm border-b border-[var(--border-subtle)] last:border-0">
                      <span className="text-[var(--ink-primary)]">{item.productos?.nombre} × {item.cantidad}</span>
                      <span className="font-semibold text-[var(--ink-primary)] tabular-nums">
                        ${(item.precio_unitario * item.cantidad).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {pedido.notas && (
                    <div className="mt-3 bg-[var(--bg)] p-3 rounded-lg">
                      <p className="text-xs text-[var(--ink-secondary)]">{pedido.notas}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}