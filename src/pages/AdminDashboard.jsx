import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../services/supabase'

const CATEGORIAS = ['ventas', 'compras', 'operaciones', 'servicios', 'general']

export default function AdminDashboard() {
  const [movimientos, setMovimientos] = useState([])
  const [clientes, setClientes] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [filtroMes, setFiltroMes] = useState('todos')
  const [form, setForm] = useState({
    tipo: 'ingreso',
    concepto: '',
    monto: '',
    categoria: 'ventas',
    fecha: new Date().toISOString().split('T')[0],
    notas: '',
  })

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      await Promise.all([
        fetchMovimientos(),
        fetchClientesData(),
        fetchUsuarios()
      ])
    } catch (err) {
      setError('Error al cargar datos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchMovimientos = async () => {
    try {
      const { data, error } = await supabase
        .from('movimientos')
        .select('*')
        .order('fecha', { ascending: false })
      if (error) throw error
      setMovimientos(data || [])
    } catch {
      setMovimientos([])
    }
  }

  const fetchClientesData = async () => {
    try {
      const { data: cli, error: cliError } = await supabase
        .from('clientes')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false })

      if (cliError) throw cliError
      setClientes(cli || [])

      if (cli && cli.length > 0) {
        const ids = cli.map(c => c.id)
        const { data: ped, error: pedError } = await supabase
          .from('pedidos')
          .select('id, cliente_id, corredor_id, total, created_at, estado, estado_pago, monto_pagado')
          .in('cliente_id', ids)
          .order('created_at', { ascending: false })

        if (pedError) throw pedError
        setPedidos(ped || [])
      }
    } catch {
      setClientes([])
      setPedidos([])
    }
  }

  const fetchUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
      if (error) throw error
      setUsuarios(data || [])
    } catch {
      setUsuarios([])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('movimientos').insert({
        ...form,
        monto: parseFloat(form.monto),
        creado_por: user?.id,
      })
      if (error) throw error
      setForm({ tipo: 'ingreso', concepto: '', monto: '', categoria: 'ventas', fecha: new Date().toISOString().split('T')[0], notas: '' })
      setShowForm(false)
      await fetchMovimientos()
    } catch (err) {
      alert('Error al guardar: ' + err.message)
    }
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este movimiento?')) return
    try {
      const { error } = await supabase.from('movimientos').delete().eq('id', id)
      if (error) throw error
      await fetchMovimientos()
    } catch (err) {
      alert('Error al eliminar: ' + err.message)
    }
  }

  const meses = [...new Set(movimientos.map(m => {
    const d = new Date(m.fecha)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }))].sort().reverse()

  const movimientosFiltrados = filtroMes === 'todos'
    ? movimientos
    : movimientos.filter(m => {
        const d = new Date(m.fecha)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === filtroMes
      })

  const totalIngresos = movimientosFiltrados.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const totalEgresos = movimientosFiltrados.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)
  const balance = totalIngresos - totalEgresos
  const totalMovimientos = movimientosFiltrados.length

  const comparativaMes = useMemo(() => {
    const now = new Date()
    const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const mesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const mesAnteriorStr = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`

    const datosMes = (filtro) => {
      const items = movimientos.filter(m => {
        const d = new Date(m.fecha)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === filtro
      })
      return {
        ingresos: items.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0),
        egresos: items.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0),
      }
    }

    const actual = filtroMes === 'todos' ? { ingresos: totalIngresos, egresos: totalEgresos } : datosMes(mesActual)
    const anterior = datosMes(mesAnteriorStr)

    const calcCambio = (act, prev) => {
      if (prev === 0) return act > 0 ? 100 : 0
      return ((act - prev) / prev) * 100
    }

    return {
      ingresos: { actual: actual.ingresos, anterior: anterior.ingresos, cambio: calcCambio(actual.ingresos, anterior.ingresos) },
      egresos: { actual: actual.egresos, anterior: anterior.egresos, cambio: calcCambio(actual.egresos, anterior.egresos) },
    }
  }, [movimientos, filtroMes, totalIngresos, totalEgresos])

  const metricasPedidos = useMemo(() => {
    if (pedidos.length === 0) return null

    const total = pedidos.length
    const montoTotal = pedidos.reduce((s, p) => s + (p.total || 0), 0)
    const ticketPromedio = total > 0 ? montoTotal / total : 0

    const now = new Date()
    const pedidosMes = pedidos.filter(p => {
      const d = new Date(p.created_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const ingresosMes = pedidosMes.reduce((s, p) => s + (p.total || 0), 0)

    const pendientes = pedidos.filter(p => p.estado === 'Pendiente').length
    const enCamino = pedidos.filter(p => p.estado === 'En camino').length
    const entregados = pedidos.filter(p => p.estado === 'Entregado').length

    const cobrado = pedidos.filter(p => p.estado_pago === 'pagado' || p.estado_pago === 'parcial')
      .reduce((s, p) => s + (p.monto_pagado || 0), 0)
    const porCobrar = montoTotal - cobrado

    return { total, montoTotal, ticketPromedio, pedidosMes: pedidosMes.length, ingresosMes, pendientes, enCamino, entregados, cobrado, porCobrar }
  }, [pedidos])

  const metricasCorredores = useMemo(() => {
    if (pedidos.length === 0 || usuarios.length === 0) return []

    const corredores = usuarios.filter(u => u.perfil === 'corredor')
    return corredores.map(c => {
      const pedCorredor = pedidos.filter(p => p.corredor_id === c.id)
      const totalVentas = pedCorredor.reduce((s, p) => s + (p.total || 0), 0)
      const clientesUnicos = new Set(pedCorredor.map(p => p.cliente_id)).size
      const pedidosEntregados = pedCorredor.filter(p => p.estado === 'Entregado').length

      return {
        id: c.id,
        email: c.email,
        nombre: c.nombre || c.email?.split('@')[0] || 'Sin nombre',
        pedidos: pedCorredor.length,
        ventas: totalVentas,
        clientes: clientesUnicos,
        entregados: pedidosEntregados,
        tasaEntrega: pedCorredor.length > 0 ? (pedidosEntregados / pedCorredor.length * 100) : 0,
      }
    }).sort((a, b) => b.ventas - a.ventas)
  }, [pedidos, usuarios])

  const clientePedidosMap = useMemo(() => {
    const map = {}
    pedidos.forEach(p => {
      if (!map[p.cliente_id] || new Date(p.created_at) > new Date(map[p.cliente_id])) {
        map[p.cliente_id] = p.created_at
      }
    })
    return map
  }, [pedidos])

  const clientesInactivos = useMemo(() => {
    return clientes.filter(c => {
      const last = clientePedidosMap[c.id]
      if (!last) return true
      return Math.floor((Date.now() - new Date(last)) / 86400000) > 30
    }).length
  }, [clientes, clientePedidosMap])

  const datosPorMes = meses.map(mes => {
    const items = movimientos.filter(m => {
      const d = new Date(m.fecha)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === mes
    })
    const ing = items.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
    const egr = items.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)
    const label = new Date(mes + '-01').toLocaleDateString('es-PE', { month: 'short', year: '2-digit' })
    return { mes, label, ingresos: ing, egresos: egr }
  })

  const maxMonto = Math.max(...datosPorMes.map(d => Math.max(d.ingresos, d.egresos)), 1)

  const formatMoney = (n) => {
    if (n < 0) return '-$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const formatFecha = (f) => new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

  const tipoBadge = (tipo) => (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={
      tipo === 'ingreso'
        ? { background: 'var(--success-bg)', color: 'var(--success-text)' }
        : { background: 'var(--danger-bg)', color: 'var(--danger)' }
    }>
      {tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
    </span>
  )

  const flechaCambio = (cambio) => {
    if (cambio === 0) return null
    const positivo = cambio > 0
    return (
      <span className={`text-[10px] font-medium ml-1`} style={{ color: positivo ? 'var(--success-text)' : 'var(--danger)' }}>
        {positivo ? '↑' : '↓'} {Math.abs(cambio).toFixed(0)}%
      </span>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="p-5 rounded-xl border" style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          <p className="font-medium">{error}</p>
          <button onClick={() => { setError(null); fetchAll() }} className="mt-2 text-sm underline">Reintentar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--ink-primary)' }}>
            Dashboard Ejecutivo
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-secondary)' }}>
            Resumen financiero y operativo
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filtroMes}
            onChange={e => setFiltroMes(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border appearance-none cursor-pointer"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--ink-primary)' }}
          >
            <option value="todos">Todos los meses</option>
            {meses.map(m => (
              <option key={m} value={m}>
                {new Date(m + '-01').toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition"
            style={{ background: 'var(--brand)' }}
          >
            {showForm ? 'Cancelar' : '+ Nuevo movimiento'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink-primary)' }}>Registrar movimiento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={form.tipo}
              onChange={e => setForm({ ...form, tipo: e.target.value })}
              className="px-3 py-2 rounded-lg text-sm border appearance-none cursor-pointer"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--ink-primary)' }}
            >
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>
            <input
              type="text"
              placeholder="Concepto"
              value={form.concepto}
              onChange={e => setForm({ ...form, concepto: e.target.value })}
              required
              className="px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--ink-primary)' }}
            />
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Monto"
              value={form.monto}
              onChange={e => setForm({ ...form, monto: e.target.value })}
              required
              className="px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--ink-primary)' }}
            />
            <select
              value={form.categoria}
              onChange={e => setForm({ ...form, categoria: e.target.value })}
              className="px-3 py-2 rounded-lg text-sm border appearance-none cursor-pointer"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--ink-primary)' }}
            >
              {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
            <input
              type="date"
              value={form.fecha}
              onChange={e => setForm({ ...form, fecha: e.target.value })}
              className="px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--ink-primary)' }}
            />
            <input
              type="text"
              placeholder="Notas (opcional)"
              value={form.notas}
              onChange={e => setForm({ ...form, notas: e.target.value })}
              className="px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--ink-primary)' }}
            />
          </div>
          <button type="submit" className="mt-3 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--brand)' }}>
            Guardar
          </button>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Ingresos totales</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--success-text)' }}>{formatMoney(totalIngresos)}</p>
                {filtroMes !== 'todos' && flechaCambio(comparativaMes.ingresos.cambio)}
              </div>
            </div>
            <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Egresos totales</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--danger)' }}>{formatMoney(totalEgresos)}</p>
                {filtroMes !== 'todos' && flechaCambio(comparativaMes.egresos.cambio)}
              </div>
            </div>
            <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Balance</p>
              <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: balance >= 0 ? 'var(--success-text)' : 'var(--danger)' }}>{formatMoney(balance)}</p>
            </div>
            <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Movimientos</p>
              <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--ink-primary)' }}>{totalMovimientos}</p>
            </div>
          </div>

          {metricasPedidos && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink-primary)' }}>Resumen de Pedidos</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Total pedidos</p>
                  <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--ink-primary)' }}>{metricasPedidos.total}</p>
                </div>
                <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Ticket promedio</p>
                  <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--brand)' }}>{formatMoney(metricasPedidos.ticketPromedio)}</p>
                </div>
                <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Ventas mes</p>
                  <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--success-text)' }}>{formatMoney(metricasPedidos.ingresosMes)}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>{metricasPedidos.pedidosMes} pedidos</p>
                </div>
                <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Cobrado</p>
                  <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--success-text)' }}>{formatMoney(metricasPedidos.cobrado)}</p>
                </div>
                <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Por cobrar</p>
                  <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: metricasPedidos.porCobrar > 0 ? 'var(--warning-text)' : 'var(--ink-muted)' }}>{formatMoney(metricasPedidos.porCobrar)}</p>
                </div>
              </div>
              <div className="flex gap-4 mt-3">
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--warning-text)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--warning-text)' }} />
                  {metricasPedidos.pendientes} pendiente(s)
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--brand)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--brand)' }} />
                  {metricasPedidos.enCamino} en camino
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--success-text)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success-text)' }} />
                  {metricasPedidos.entregados} entregados
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink-primary)' }}>Métricas de Clientes</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Total clientes</p>
                <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--ink-primary)' }}>{clientes.length}</p>
              </div>
              <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Nuevos este mes</p>
                <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--success-text)' }}>
                  {clientes.filter(c => {
                    const d = new Date(c.created_at)
                    const now = new Date()
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
                  }).length}
                </p>
              </div>
              <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>Inactivos (30+ días)</p>
                <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: clientesInactivos > 0 ? 'var(--warning-text)' : 'var(--ink-muted)' }}>
                  {clientesInactivos}
                </p>
              </div>
              <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>VIP</p>
                <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: 'var(--brand)' }}>
                  {clientes.filter(c => c.tipo_cliente === 'vip').length}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink-primary)' }}>Top 10 Clientes por Volumen</h3>
              {(() => {
                const clienteStats = {}
                pedidos.forEach(p => {
                  if (!clienteStats[p.cliente_id]) clienteStats[p.cliente_id] = { total: 0, monto: 0, pedidos: 0 }
                  clienteStats[p.cliente_id].pedidos++
                  clienteStats[p.cliente_id].monto += p.total || 0
                })

                const top = Object.entries(clienteStats)
                  .map(([id, stats]) => {
                    const cli = clientes.find(c => c.id === id)
                    return { ...stats, nombre: cli?.nombre || 'Desconocido', tipo: cli?.tipo_cliente || 'general' }
                  })
                  .sort((a, b) => b.monto - a.monto)
                  .slice(0, 10)

                if (top.length === 0) {
                  return <p className="text-sm text-center py-6" style={{ color: 'var(--ink-muted)' }}>Sin datos de pedidos</p>
                }

                const maxMontoTop = Math.max(...top.map(t => t.monto), 1)

                return (
                  <div className="space-y-3">
                    {top.map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-medium w-6 text-center" style={{ color: 'var(--ink-muted)' }}>#{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium" style={{ color: 'var(--ink-primary)' }}>{item.nombre}</span>
                            <span className="text-xs tabular-nums" style={{ color: 'var(--brand)' }}>{formatMoney(item.monto)}</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${(item.monto / maxMontoTop) * 100}%`, background: 'var(--brand)' }}
                            />
                          </div>
                          <span className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>{item.pedidos} pedido(s)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>

          {metricasCorredores.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink-primary)' }}>Rendimiento por Corredor</h2>
              <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Corredor</th>
                        <th className="text-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Pedidos</th>
                        <th className="text-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Clientes</th>
                        <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Ventas</th>
                        <th className="text-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Entregados</th>
                        <th className="text-center px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Tasa Entrega</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metricasCorredores.map((c) => (
                        <tr key={c.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                          <td className="px-5 py-3">
                            <div>
                              <p className="font-medium" style={{ color: 'var(--ink-primary)' }}>{c.nombre}</p>
                              <p className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>{c.email}</p>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center font-semibold tabular-nums" style={{ color: 'var(--ink-primary)' }}>{c.pedidos}</td>
                          <td className="px-5 py-3 text-center tabular-nums" style={{ color: 'var(--ink-secondary)' }}>{c.clientes}</td>
                          <td className="px-5 py-3 text-right font-semibold tabular-nums" style={{ color: 'var(--brand)' }}>{formatMoney(c.ventas)}</td>
                          <td className="px-5 py-3 text-center tabular-nums" style={{ color: 'var(--success-text)' }}>{c.entregados}</td>
                          <td className="px-5 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{
                              background: c.tasaEntrega >= 80 ? 'var(--success-bg)' : c.tasaEntrega >= 50 ? 'var(--warning-bg)' : 'var(--danger-bg)',
                              color: c.tasaEntrega >= 80 ? 'var(--success-text)' : c.tasaEntrega >= 50 ? 'var(--warning-text)' : 'var(--danger)',
                            }}>
                              {c.tasaEntrega.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink-primary)' }}>Ingresos vs Egresos por mes</h3>
              <div className="flex items-end gap-3 h-48">
                {datosPorMes.map((d) => (
                  <div key={d.mes} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div className="w-full flex gap-1 items-end" style={{ height: '160px' }}>
                      <div
                        className="flex-1 rounded-t transition-all duration-300 cursor-pointer hover:opacity-80"
                        style={{ height: `${(d.ingresos / maxMonto) * 100}%`, background: 'var(--success-text)', minHeight: d.ingresos > 0 ? '4px' : '0' }}
                        title={`Ingresos: ${formatMoney(d.ingresos)}`}
                      />
                      <div
                        className="flex-1 rounded-t transition-all duration-300 cursor-pointer hover:opacity-80"
                        style={{ height: `${(d.egresos / maxMonto) * 100}%`, background: 'var(--danger)', minHeight: d.egresos > 0 ? '4px' : '0' }}
                        title={`Egresos: ${formatMoney(d.egresos)}`}
                      />
                    </div>
                    <p className="text-[10px] font-medium" style={{ color: 'var(--ink-muted)' }}>{d.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--success-text)' }} />
                  <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>Ingresos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--danger)' }} />
                  <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>Egresos</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink-primary)' }}>Distribución por categoría</h3>
              {(() => {
                const porCategoria = {}
                movimientosFiltrados.forEach(m => {
                  if (!porCategoria[m.categoria]) porCategoria[m.categoria] = { ingresos: 0, egresos: 0 }
                  if (m.tipo === 'ingreso') porCategoria[m.categoria].ingresos += m.monto
                  else porCategoria[m.categoria].egresos += m.monto
                })
                const cats = Object.entries(porCategoria).sort((a, b) => (b[1].ingresos + b[1].egresos) - (a[1].ingresos + a[1].egresos))
                const totalCat = cats.reduce((s, [, v]) => s + v.ingresos + v.egresos, 0) || 1
                const colors = ['var(--brand)', 'var(--success-text)', 'var(--danger)', 'var(--info-text)', 'var(--warning-text)']
                return cats.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--ink-muted)' }}>Sin datos</p>
                ) : (
                  <div className="space-y-3">
                    {cats.map(([cat, val], _i) => {
                      const total = val.ingresos + val.egresos
                      const pct = (total / totalCat) * 100
                      return (
                        <div key={cat}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium capitalize" style={{ color: 'var(--ink-secondary)' }}>{cat}</span>
                            <span className="text-xs tabular-nums" style={{ color: 'var(--ink-muted)' }}>{formatMoney(total)} ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: colors[_i % colors.length] }} />
                          </div>
                          <div className="flex gap-3 mt-0.5">
                            <span className="text-[10px]" style={{ color: 'var(--success-text)' }}>↑ {formatMoney(val.ingresos)}</span>
                            <span className="text-[10px]" style={{ color: 'var(--danger)' }}>↓ {formatMoney(val.egresos)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </div>

          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="px-5 py-4" style={{ background: 'var(--surface-2)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>Últimos movimientos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Fecha</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Tipo</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Concepto</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Categoría</th>
                    <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Monto</th>
                    <th className="text-right px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {movimientosFiltrados.map(m => (
                    <tr key={m.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-5 py-3 text-xs tabular-nums" style={{ color: 'var(--ink-muted)' }}>{formatFecha(m.fecha)}</td>
                      <td className="px-5 py-3">{tipoBadge(m.tipo)}</td>
                      <td className="px-5 py-3 font-medium" style={{ color: 'var(--ink-primary)' }}>{m.concepto}</td>
                      <td className="px-5 py-3 text-xs capitalize" style={{ color: 'var(--ink-secondary)' }}>{m.categoria}</td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums" style={{ color: m.tipo === 'ingreso' ? 'var(--success-text)' : 'var(--danger)' }}>
                        {m.tipo === 'ingreso' ? '+' : '-'}{formatMoney(m.monto)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleEliminar(m.id)}
                          className="text-xs transition px-2 py-1 rounded"
                          style={{ color: 'var(--ink-muted)' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-muted)'}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {movimientosFiltrados.length === 0 && (
                <div className="text-center py-12">
                  <p style={{ color: 'var(--ink-muted)' }}>No hay movimientos registrados</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}