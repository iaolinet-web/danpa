import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../services/supabase'

const FILTROS_PAGO = ['todos', 'pagado', 'parcial', 'no_pagado']
const TIPOS_PAGO_LABEL = {
  efectivo: 'Efectivo', tarjeta_credito: 'Tarjeta Crédito', tarjeta_debito: 'Tarjeta Débito',
  transferencia: 'Transferencia', yape: 'Yape', plin: 'Plin', cheque: 'Cheque', otro: 'Otro', '': '—',
}
const PAGO_COLORS = {
  pagado: { bg: 'var(--success-bg)', text: 'var(--success-text)' },
  parcial: { bg: 'var(--warning-bg)', text: 'var(--warning-text)' },
  no_pagado: { bg: 'var(--danger-bg)', text: 'var(--danger)' },
}

const TIPOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta_credito', label: 'Tarjeta Crédito' },
  { value: 'tarjeta_debito', label: 'Tarjeta Débito' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'yape', label: 'Yape' },
  { value: 'plin', label: 'Plin' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'otro', label: 'Otro' },
]

export default function CobrosAdmin() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState(null)
  const [formPago, setFormPago] = useState({ monto_pagado: '', tipo_pago: 'efectivo', referencia_pago: '', fecha_pago: new Date().toLocaleDateString('en-CA') })

  useEffect(() => { fetchPedidos() }, [])

  const fetchPedidos = async () => {
    const { data } = await supabase
      .from('pedidos')
      .select('*, clientes(nombre, telefono)')
      .eq('estado', 'Entregado')
      .order('created_at', { ascending: false })
    setPedidos(data || [])
    setLoading(false)
  }

  const fmt = (n) => '$' + (n || 0).toFixed(2)

  const diasDesde = (fecha) => {
    return Math.floor((new Date() - new Date(fecha)) / 86400000)
  }

  const getAgingLabel = (dias) => {
    if (dias <= 7) return { label: `${dias}d`, color: 'var(--success-text)' }
    if (dias <= 15) return { label: `${dias}d`, color: 'var(--warning-text)' }
    if (dias <= 30) return { label: `${dias}d`, color: 'var(--danger)' }
    return { label: `${dias}d`, color: 'var(--danger)', urgent: true }
  }

  const filtrados = useMemo(() => {
    return pedidos.filter(p => {
      const matchFiltro = filtro === 'todos' || p.estado_pago === filtro
      const matchBusqueda = busqueda === '' ||
        p.clientes?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.id?.toLowerCase().includes(busqueda.toLowerCase())

      if (filtroPeriodo === 'todos') return matchFiltro && matchBusqueda

      const dias = diasDesde(p.created_at)
      if (filtroPeriodo === 'semana' && dias > 7) return false
      if (filtroPeriodo === 'mes' && dias > 30) return false
      if (filtroPeriodo === 'trimestre' && dias > 90) return false

      return matchFiltro && matchBusqueda
    })
  }, [pedidos, filtro, filtroPeriodo, busqueda])

  const totalVentas = filtrados.reduce((s, p) => s + p.total, 0)
  const totalCobrado = filtrados.reduce((s, p) => s + (p.monto_pagado || 0), 0)
  const totalPendiente = totalVentas - totalCobrado
  const pedidosPagados = filtrados.filter(p => p.estado_pago === 'pagado').length
  const pedidosParciales = filtrados.filter(p => p.estado_pago === 'parcial').length
  const pedidosNoPagados = filtrados.filter(p => p.estado_pago === 'no_pagado').length

  const pendientes = filtrados.filter(p => p.estado_pago !== 'pagado')
  const diasPromedioCobro = useMemo(() => {
    const pagados = pedidos.filter(p => p.estado_pago === 'pagado' && p.fecha_pago)
    if (pagados.length === 0) return 0
    const totalDias = pagados.reduce((s, p) => {
      const dias = Math.floor((new Date(p.fecha_pago) - new Date(p.created_at)) / 86400000)
      return s + Math.max(dias, 0)
    }, 0)
    return Math.round(totalDias / pagados.length)
  }, [pedidos])

  const registrarPago = async (pedidoId) => {
    const pedido = pedidos.find(p => p.id === pedidoId)
    if (!pedido) return
    const monto = parseFloat(formPago.monto_pagado) || 0
    if (monto < 0) { alert('El monto no puede ser negativo'); return }
    const saldo = pedido.total - (pedido.monto_pagado || 0)
    if (monto > saldo * 1.5) { if (!confirm(`El monto ($${monto.toFixed(2)}) excede el saldo ($${saldo.toFixed(2)}). ¿Continuar?`)) return }

    const nuevoMonto = (pedido.monto_pagado || 0) + monto
    let estado_pago = 'no_pagado'
    if (nuevoMonto >= pedido.total) estado_pago = 'pagado'
    else if (nuevoMonto > 0) estado_pago = 'parcial'

    try {
      const { error } = await supabase.from('pedidos').update({
        estado_pago, monto_pagado: nuevoMonto, tipo_pago: formPago.tipo_pago,
        referencia_pago: formPago.referencia_pago, fecha_pago: formPago.fecha_pago,
      }).eq('id', pedidoId)
      if (error) throw error

      setPedidos(prev => prev.map(p => p.id === pedidoId ? {
        ...p, estado_pago, monto_pagado: nuevoMonto, tipo_pago: formPago.tipo_pago,
        referencia_pago: formPago.referencia_pago, fecha_pago: formPago.fecha_pago,
      } : p))
      setEditando(null)
      setFormPago({ monto_pagado: '', tipo_pago: 'efectivo', referencia_pago: '', fecha_pago: new Date().toLocaleDateString('en-CA') })
    } catch (err) {
      alert('Error al registrar pago: ' + err.message)
    }
  }

  const enviarRecordatorio = (pedido) => {
    const telefono = pedido.clientes?.telefono
    if (!telefono) { alert('El cliente no tiene teléfono registrado'); return }
    const tel = telefono.replace(/[^0-9+]/g, '')
    const cliente = pedido.clientes?.nombre || 'Cliente'
    const saldo = pedido.total - (pedido.monto_pagado || 0)
    const dias = diasDesde(pedido.created_at)

    let mensaje = `*RECORDATORIO DE COBRO - danpa*\n\n`
    mensaje += `Cliente: ${cliente}\n`
    mensaje += `Pedido: ${new Date(pedido.created_at).toLocaleDateString('es-PE')}\n`
    mensaje += `Días pendientes: ${dias} días\n\n`
    mensaje += `*Total: $${pedido.total.toFixed(2)}*\n`
    mensaje += `*Pagado: $${(pedido.monto_pagado || 0).toFixed(2)}*\n`
    mensaje += `*Pendiente: $${saldo.toFixed(2)}*\n\n`
    mensaje += `Le recordamos que tiene un saldo pendiente de pago. Gracias.`

    const url = `https://wa.me/${tel.startsWith('+') ? tel.substring(1) : tel}?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
  }

  const exportarCSV = () => {
    const esc = (v) => {
      const s = String(v ?? '')
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"'
      }
      return s
    }
    const headers = ['Fecha', 'Cliente', 'Teléfono', 'Total', 'Pagado', 'Pendiente', 'Estado', 'Tipo Pago', 'Días', 'Referencia']
    const rows = filtrados.map(p => [
      new Date(p.created_at).toLocaleDateString('es-PE'),
      p.clientes?.nombre || '',
      p.clientes?.telefono || '',
      p.total,
      p.monto_pagado || 0,
      p.total - (p.monto_pagado || 0),
      p.estado_pago,
      TIPOS_PAGO_LABEL[p.tipo_pago] || '',
      diasDesde(p.created_at),
      p.referencia_pago || '',
    ])
    const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cobros_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatFecha = (f) => new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--surface-2)] border-t-[var(--brand)]" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--ink-primary)' }}>Control de Cobros</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-secondary)' }}>Seguimiento de pagos de pedidos entregados</p>
        </div>
        <button onClick={exportarCSV}
          className="px-3 py-2 text-sm font-medium rounded-lg transition flex items-center gap-1.5"
          style={{ background: 'var(--surface-2)', color: 'var(--ink-secondary)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {[
          { label: 'Total ventas', value: fmt(totalVentas), color: 'var(--ink-primary)' },
          { label: 'Cobrado', value: fmt(totalCobrado), color: 'var(--success-text)' },
          { label: 'Pendiente', value: fmt(totalPendiente), color: totalPendiente > 0 ? 'var(--danger)' : 'var(--ink-muted)' },
          { label: 'Pagados', value: pedidosPagados, color: 'var(--success-text)' },
          { label: 'Parciales', value: pedidosParciales, color: 'var(--warning-text)' },
          { label: 'Sin pagar', value: pedidosNoPagados, color: 'var(--danger)' },
        ].map((c, i) => (
          <div key={i} className="p-4 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>{c.label}</p>
            <p className="text-lg font-bold mt-1 tabular-nums" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input type="text" placeholder="Buscar cliente o ID..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg text-sm border outline-none"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--ink-primary)' }} />
        </div>
        <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border appearance-none cursor-pointer"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--ink-primary)' }}>
          <option value="todos">Todos los períodos</option>
          <option value="semana">Última semana</option>
          <option value="mes">Último mes</option>
          <option value="trimestre">Último trimestre</option>
        </select>
        <div className="flex gap-1.5 flex-wrap">
          {FILTROS_PAGO.map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition"
              style={filtro === f ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink-secondary)' }}>
              {f === 'todos' ? 'Todos' : f === 'pagado' ? 'Pagado' : f === 'parcial' ? 'Parcial' : 'Sin pagar'}
            </button>
          ))}
        </div>
      </div>

      {pendientes.length > 0 && (
        <div className="p-4 rounded-xl border mb-6" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger)' }}>
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5" style={{ color: 'var(--danger)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
              {pendientes.length} pedido(s) con cobro pendiente — Días promedio de cobro: {diasPromedioCobro} días
            </span>
          </div>
        </div>
      )}

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Fecha</th>
                <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Cliente</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Total</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Pagado</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Pendiente</th>
                <th className="text-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Estado</th>
                <th className="text-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Días</th>
                <th className="text-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Tipo</th>
                <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => {
                const saldo = p.total - (p.monto_pagado || 0)
                const pc = PAGO_COLORS[p.estado_pago] || PAGO_COLORS.no_pagado
                const pct = p.total > 0 ? ((p.monto_pagado || 0) / p.total * 100) : 0
                const dias = diasDesde(p.created_at)
                const aging = getAgingLabel(dias)
                const esUrgente = dias > 30 && p.estado_pago !== 'pagado'

                return (
                  <>
                  <tr key={p.id} className="border-t transition-colors hover:bg-[var(--hover-subtle)]"
                    style={{ borderColor: esUrgente ? 'var(--danger)' : 'var(--border)', background: esUrgente ? 'var(--danger-bg)' : undefined }}>
                    <td className="px-5 py-3 text-xs tabular-nums" style={{ color: 'var(--ink-muted)' }}>{formatFecha(p.created_at)}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium" style={{ color: 'var(--ink-primary)' }}>{p.clientes?.nombre || '—'}</p>
                      {p.clientes?.telefono && <p className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>{p.clientes.telefono}</p>}
                    </td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums" style={{ color: 'var(--ink-primary)' }}>{fmt(p.total)}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold" style={{ color: 'var(--success-text)' }}>{fmt(p.monto_pagado)}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold" style={{ color: saldo > 0 ? 'var(--danger)' : 'var(--success-text)' }}>{fmt(saldo)}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: pc.bg, color: pc.text }}>
                          {p.estado_pago === 'pagado' ? 'Pagado' : p.estado_pago === 'parcial' ? 'Parcial' : 'Sin pagar'}
                        </span>
                        <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--success-text)' : 'var(--warning-text)' }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums" style={{ background: `${aging.color}20`, color: aging.color }}>
                        {aging.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center text-xs capitalize" style={{ color: 'var(--ink-secondary)' }}>
                      {TIPOS_PAGO_LABEL[p.tipo_pago] || '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {p.estado_pago !== 'pagado' && (
                        editando === p.id ? (
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => registrarPago(p.id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: 'var(--brand)', color: '#fff' }}>OK</button>
                            <button onClick={() => setEditando(null)} className="text-xs px-2 py-1.5 rounded-lg" style={{ color: 'var(--ink-muted)', background: 'var(--surface-2)' }}>Cancelar</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => enviarRecordatorio(p)}
                              className="text-[10px] px-2 py-1 rounded transition font-medium"
                              style={{ background: '#25D36620', color: '#25D366' }}
                              title="Enviar recordatorio WhatsApp">
                              📱
                            </button>
                            <button onClick={() => { setEditando(p.id); setFormPago({ monto_pagado: saldo.toFixed(2), tipo_pago: p.tipo_pago || 'efectivo', referencia_pago: p.referencia_pago || '', fecha_pago: p.fecha_pago || new Date().toLocaleDateString('en-CA') }) }}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg transition" style={{ color: 'var(--brand)' }}>
                              Cobrar
                            </button>
                          </div>
                        )
                      )}
                    </td>
                  </tr>
                  {editando === p.id && (
                    <tr>
                      <td colSpan={9} className="px-5 py-4" style={{ background: 'var(--surface-2)' }}>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--ink-muted)' }}>Monto</label>
                            <input type="number" step="0.01" min="0" value={formPago.monto_pagado}
                              onChange={e => setFormPago({ ...formPago, monto_pagado: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg text-sm border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--ink-primary)' }} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--ink-muted)' }}>Tipo</label>
                            <select value={formPago.tipo_pago} onChange={e => setFormPago({ ...formPago, tipo_pago: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg text-sm border appearance-none cursor-pointer" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--ink-primary)' }}>
                              {TIPOS_PAGO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--ink-muted)' }}>Fecha</label>
                            <input type="date" value={formPago.fecha_pago}
                              onChange={e => setFormPago({ ...formPago, fecha_pago: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg text-sm border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--ink-primary)' }} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--ink-muted)' }}>Referencia</label>
                            <input type="text" value={formPago.referencia_pago} placeholder="Opcional"
                              onChange={e => setFormPago({ ...formPago, referencia_pago: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg text-sm border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--ink-primary)' }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtrados.length === 0 && (
          <div className="text-center py-12">
            <p style={{ color: 'var(--ink-muted)' }}>{busqueda || filtroPeriodo !== 'todos' ? 'No se encontraron cobros con esos filtros' : 'No hay pedidos entregados'}</p>
          </div>
        )}
      </div>
    </div>
  )
}