import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

const TIPOS_CLIENTE = [
  { value: 'general', label: 'General', color: 'var(--ink-secondary)' },
  { value: 'frecuente', label: 'Frecuente', color: 'var(--brand)' },
  { value: 'nuevo', label: 'Nuevo', color: 'var(--success-text)' },
  { value: 'vip', label: 'VIP', color: 'var(--warning-text)' },
  { value: 'moroso', label: 'Moroso', color: 'var(--danger)' },
  { value: 'inactivo', label: 'Inactivo', color: 'var(--ink-muted)' },
]

export default function Clientes() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState([])
  const [pedidosMap, setPedidosMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({
    nombre: '', telefono: '', direccion: '', notas: '',
    latitud: '', longitud: '', tipo_cliente: 'general'
  })

  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroActividad, setFiltroActividad] = useState('todos')

  useEffect(() => {
    fetchClientes()
  }, [])

  const fetchClientes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('corredor_id', user.id)
      .eq('activo', true)
      .order('nombre')

    setClientes(data || [])

    if (data && data.length > 0) {
      const clienteIds = data.map(c => c.id)
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('id, cliente_id, total, created_at, estado')
        .in('cliente_id', clienteIds)
        .eq('corredor_id', user.id)
        .order('created_at', { ascending: false })

      const map = {}
      pedidos?.forEach(p => {
        if (!map[p.cliente_id]) {
          map[p.cliente_id] = { total: 0, montoTotal: 0, ultimoPedido: null, pedidos: [] }
        }
        map[p.cliente_id].total++
        map[p.cliente_id].montoTotal += p.total || 0
        map[p.cliente_id].pedidos.push(p)
        if (!map[p.cliente_id].ultimoPedido) {
          map[p.cliente_id].ultimoPedido = p.created_at
        }
      })
      setPedidosMap(map)
    }

    setLoading(false)
  }

  const resetForm = () => {
    setForm({
      nombre: '', telefono: '', direccion: '', notas: '',
      latitud: '', longitud: '', tipo_cliente: 'general'
    })
    setEditando(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const data = {
        nombre: form.nombre,
        telefono: form.telefono,
        direccion: form.direccion,
        notas: form.notas,
        tipo_cliente: form.tipo_cliente,
        latitud: form.latitud ? parseFloat(form.latitud) : null,
        longitud: form.longitud ? parseFloat(form.longitud) : null,
      }

      let result
      if (editando) {
        result = await supabase.from('clientes').update(data).eq('id', editando)
      } else {
        result = await supabase.from('clientes').insert({ ...data, corredor_id: user.id, activo: true })
      }
      if (result.error) throw result.error

      await fetchClientes()
      resetForm()
    } catch (err) {
      alert('Error al guardar cliente: ' + err.message)
    }
  }

  const handleEdit = (e, cliente) => {
    e.stopPropagation()
    setForm({
      nombre: cliente.nombre,
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      notas: cliente.notas || '',
      tipo_cliente: cliente.tipo_cliente || 'general',
      latitud: cliente.latitud?.toString() || '',
      longitud: cliente.longitud?.toString() || '',
    })
    setEditando(cliente.id)
    setShowForm(true)
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    const info = pedidosMap[id]
    const msg = info
      ? `¿Desactivar este cliente?\n\nTiene ${info.total} pedido(s) por $${info.montoTotal.toFixed(2)}.\nSe archivará pero no se eliminará.`
      : '¿Desactivar este cliente?\n\nSe archivará pero no se eliminará.'
    if (!confirm(msg)) return
    await supabase.from('clientes').update({ activo: false }).eq('id', id)
    await fetchClientes()
  }

  const handleWhatsApp = (e, telefono) => {
    e.stopPropagation()
    const tel = telefono.replace(/[^0-9+]/g, '')
    window.open(`https://wa.me/${tel.startsWith('+') ? tel.substring(1) : tel}`, '_blank')
  }

  const handleObtenerUbicacion = () => {
    if (!navigator.geolocation) return
    if (!confirm('Se usará tu ubicación actual como coordenadas del cliente. ¿Continuar?')) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm({
          ...form,
          latitud: pos.coords.latitude.toFixed(6),
          longitud: pos.coords.longitude.toFixed(6),
        })
      },
      () => alert('No se pudo obtener la ubicación')
    )
  }

  const clientesFiltrados = useMemo(() => {
    return clientes.filter(c => {
      if (busqueda) {
        const q = busqueda.toLowerCase()
        const matchNombre = c.nombre?.toLowerCase().includes(q)
        const matchTelefono = c.telefono?.toLowerCase().includes(q)
        const matchDireccion = c.direccion?.toLowerCase().includes(q)
        if (!matchNombre && !matchTelefono && !matchDireccion) return false
      }
      if (filtroTipo !== 'todos' && c.tipo_cliente !== filtroTipo) return false
      if (filtroActividad !== 'todos') {
        const info = pedidosMap[c.id]
        const daysSince = info?.ultimoPedido
          ? Math.floor((Date.now() - new Date(info.ultimoPedido)) / 86400000)
          : 999
        if (filtroActividad === 'activos' && daysSince > 30) return false
        if (filtroActividad === 'inactivos' && daysSince <= 30) return false
      }
      return true
    })
  }, [clientes, busqueda, filtroTipo, filtroActividad, pedidosMap])

  const clientesInactivos = useMemo(() => {
    return clientes.filter(c => {
      const info = pedidosMap[c.id]
      if (!info?.ultimoPedido) return true
      const days = Math.floor((Date.now() - new Date(info.ultimoPedido)) / 86400000)
      return days > 30
    }).length
  }, [clientes, pedidosMap])

  const diasDesde = (fecha) => {
    if (!fecha) return null
    const days = Math.floor((Date.now() - new Date(fecha)) / 86400000)
    if (days === 0) return 'Hoy'
    if (days === 1) return 'Ayer'
    if (days < 7) return `Hace ${days}d`
    if (days < 30) return `Hace ${Math.floor(days / 7)}sem`
    return `Hace ${Math.floor(days / 30)}m`
  }

  const getTipoBadge = (tipo) => {
    const t = TIPOS_CLIENTE.find(t => t.value === tipo) || TIPOS_CLIENTE[0]
    return (
      <span
        className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
        style={{ background: `${t.color}20`, color: t.color }}
      >
        {t.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="h-8 w-48 bg-[var(--surface-2)] rounded-lg animate-pulse" />
          <div className="h-10 w-40 bg-[var(--surface-2)] rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-3">
              <div className="h-5 w-3/4 bg-[var(--surface-2)] rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-[var(--surface-2)] rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-[var(--surface-2)] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink-primary)]">
            Mis Clientes
          </h1>
          <p className="text-sm text-[var(--ink-secondary)] mt-1">
            {clientes.length} cliente(s) registrado(s)
            {clientesInactivos > 0 && (
              <span className="ml-2 text-[var(--warning-text)]">
                • {clientesInactivos} inactivo(s) sin pedidos en 30+ días
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm) }}
          className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors duration-150"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Cliente'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6">
          <h3 className="text-base font-semibold text-[var(--ink-primary)] mb-5">
            {editando ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--ink-secondary)] mb-1.5">Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 text-sm text-[var(--ink-primary)] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] transition-colors duration-150 placeholder:text-[var(--ink-muted)]"
                placeholder="Nombre del cliente"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--ink-secondary)] mb-1.5">Tipo de Cliente</label>
              <select
                value={form.tipo_cliente}
                onChange={e => setForm({ ...form, tipo_cliente: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm text-[var(--ink-primary)] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] transition-colors duration-150"
              >
                {TIPOS_CLIENTE.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--ink-secondary)] mb-1.5">Teléfono</label>
              <input
                type="tel"
                value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm text-[var(--ink-primary)] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] transition-colors duration-150 placeholder:text-[var(--ink-muted)]"
                placeholder="+52 55 1234 5678"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--ink-secondary)] mb-1.5">Dirección</label>
              <input
                type="text"
                value={form.direccion}
                onChange={e => setForm({ ...form, direccion: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm text-[var(--ink-primary)] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] transition-colors duration-150 placeholder:text-[var(--ink-muted)]"
                placeholder="Calle, número, colonia"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--ink-secondary)] mb-1.5">Latitud</label>
              <input
                type="number"
                step="any"
                value={form.latitud}
                onChange={e => setForm({ ...form, latitud: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm text-[var(--ink-primary)] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] transition-colors duration-150 placeholder:text-[var(--ink-muted)]"
                placeholder="19.4326"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--ink-secondary)] mb-1.5">Longitud</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  value={form.longitud}
                  onChange={e => setForm({ ...form, longitud: e.target.value })}
                  className="flex-1 px-3.5 py-2.5 text-sm text-[var(--ink-primary)] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] transition-colors duration-150 placeholder:text-[var(--ink-muted)]"
                  placeholder="-99.1332"
                />
                <button
                  type="button"
                  onClick={handleObtenerUbicacion}
                  className="px-3 py-2.5 bg-[var(--surface-2)] hover:bg-[var(--hover-subtle)] text-[var(--ink-secondary)] rounded-lg transition-colors duration-150 shrink-0"
                  title="Usar mi ubicación actual"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--ink-secondary)] mb-1.5">Notas</label>
              <textarea
                value={form.notas}
                onChange={e => setForm({ ...form, notas: e.target.value })}
                rows={2}
                className="w-full px-3.5 py-2.5 text-sm text-[var(--ink-primary)] bg-[var(--surface-2)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] transition-colors duration-150 placeholder:text-[var(--ink-muted)] resize-none"
                placeholder="Referencias, horarios, etc."
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors duration-150"
          >
            {editando ? 'Guardar Cambios' : 'Crear Cliente'}
          </button>
        </form>
      )}

      {clientes.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, teléfono o dirección..."
                className="w-full pl-10 pr-4 py-2.5 text-sm text-[var(--ink-primary)] bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] transition-colors duration-150 placeholder:text-[var(--ink-muted)]"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="px-3 py-2.5 text-sm text-[var(--ink-primary)] bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:outline-none appearance-none cursor-pointer"
          >
            <option value="todos">Todos los tipos</option>
            {TIPOS_CLIENTE.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={filtroActividad}
            onChange={e => setFiltroActividad(e.target.value)}
            className="px-3 py-2.5 text-sm text-[var(--ink-primary)] bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:outline-none appearance-none cursor-pointer"
          >
            <option value="todos">Toda actividad</option>
            <option value="activos">Activos (último mes)</option>
            <option value="inactivos">Inactivos (30+ días)</option>
          </select>
        </div>
      )}

      {clientes.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[var(--ink-muted)] text-base">No tienes clientes registrados</p>
          <p className="text-[var(--ink-muted)] text-sm mt-1">Agrega tu primer cliente para comenzar</p>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
          <p className="text-[var(--ink-muted)]">No se encontraron clientes con esos filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {clientesFiltrados.map(cliente => {
            const info = pedidosMap[cliente.id]
            const ultimoPedidoDias = info?.ultimoPedido
              ? Math.floor((Date.now() - new Date(info.ultimoPedido)) / 86400000)
              : null
            const isInactivo = !ultimoPedidoDias || ultimoPedidoDias > 30

            return (
              <div
                key={cliente.id}
                onClick={() => navigate(`/clientes/${cliente.id}`)}
                className={`bg-[var(--surface)] border rounded-xl p-5 transition-all duration-150 hover:shadow-sm cursor-pointer group ${
                  isInactivo ? 'border-[var(--warning-text)]/30' : 'border-[var(--border)]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--ink-primary)] group-hover:text-[var(--brand)] transition-colors">
                      {cliente.nombre}
                    </h3>
                    {getTipoBadge(cliente.tipo_cliente)}
                  </div>
                  <svg className="w-4 h-4 text-[var(--ink-muted)] group-hover:text-[var(--brand)] transition-colors shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>

                {isInactivo && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-[var(--warning-text)]">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <span className="text-[10px] font-medium">Sin pedidos en {ultimoPedidoDias || '?'} días</span>
                  </div>
                )}

                {info && (
                  <div className="flex gap-3 mt-2 text-xs text-[var(--ink-secondary)]">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      {info.total} pedido(s)
                    </span>
                    <span className="font-medium text-[var(--brand)]">${info.montoTotal.toFixed(2)}</span>
                    {info.ultimoPedido && (
                      <span className="text-[var(--ink-muted)]">• {diasDesde(info.ultimoPedido)}</span>
                    )}
                  </div>
                )}

                {cliente.telefono && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-[var(--ink-secondary)]">
                    <svg className="w-4 h-4 shrink-0 text-[var(--ink-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    <span>{cliente.telefono}</span>
                  </div>
                )}

                {cliente.direccion && (
                  <div className="flex items-center gap-2 mt-1.5 text-sm text-[var(--ink-secondary)]">
                    <svg className="w-4 h-4 shrink-0 text-[var(--ink-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span>{cliente.direccion}</span>
                  </div>
                )}

                {cliente.notas && (
                  <p className="text-[var(--ink-muted)] text-xs italic mt-2.5 leading-relaxed">{cliente.notas}</p>
                )}

                {cliente.latitud && cliente.longitud && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-[var(--brand)]">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span>Ubicación registrada</span>
                  </div>
                )}

                <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border)]">
                  {cliente.telefono && (
                    <button
                      onClick={(e) => handleWhatsApp(e, cliente.telefono)}
                      className="px-3 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-xs font-medium rounded-lg transition-colors duration-150 flex items-center gap-1.5"
                      title="Abrir WhatsApp"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </button>
                  )}
                  <button
                    onClick={(e) => handleEdit(e, cliente)}
                    className="px-3.5 py-1.5 bg-[var(--surface-2)] hover:bg-[var(--hover-subtle)] text-[var(--ink-secondary)] text-xs font-medium rounded-lg transition-colors duration-150"
                  >
                    Editar
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, cliente.id)}
                    className="px-3.5 py-1.5 bg-[var(--danger-bg)] hover:bg-[var(--danger-bg)] text-[var(--danger)] text-xs font-medium rounded-lg transition-colors duration-150"
                  >
                    Archivar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}