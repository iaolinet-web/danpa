import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../services/supabase'

const COST_FIELDS = [
  { key: 'costo_adquisicion', label: 'Adquisición', color: 'var(--brand)' },
  { key: 'costo_transporte', label: 'Transporte', color: 'var(--info-text)' },
  { key: 'costo_empaque', label: 'Empaque', color: 'var(--warning-text)' },
  { key: 'costo_almacenaje', label: 'Almacenaje', color: 'var(--success-text)' },
  { key: 'costo_comision', label: 'Comisión', color: '#8b5cf6' },
  { key: 'costo_otros', label: 'Otros', color: 'var(--ink-muted)' },
]

const CATEGORIAS = [
  { value: 'general', label: 'General' },
  { value: 'alimentos', label: 'Alimentos' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'electronica', label: 'Electrónica' },
  { value: 'ropa', label: 'Ropa' },
  { value: 'hogar', label: 'Hogar' },
  { value: 'salud', label: 'Salud' },
  { value: 'belleza', label: 'Belleza' },
  { value: 'deportes', label: 'Deportes' },
  { value: 'otros', label: 'Otros' },
]

export default function ProductosAdmin() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [vista, setVista] = useState('tabla')
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [filtroStock, setFiltroStock] = useState('todos')
  const [form, setForm] = useState({
    nombre: '', descripcion: '', precio: '', stock: '', imagen_url: '', activo: true,
    categoria: 'general', stock_minimo: '5',
    costo_adquisicion: '', costo_transporte: '', costo_empaque: '', costo_almacenaje: '', costo_comision: '', costo_otros: '',
  })

  useEffect(() => { fetchProductos() }, [])

  const fetchProductos = async () => {
    const { data } = await supabase.from('productos').select('*').order('nombre')
    setProductos(data || [])
    setLoading(false)
  }

  const calcCostoTotal = (f) =>
    (parseFloat(f.costo_adquisicion) || 0) +
    (parseFloat(f.costo_transporte) || 0) +
    (parseFloat(f.costo_empaque) || 0) +
    (parseFloat(f.costo_almacenaje) || 0) +
    (parseFloat(f.costo_comision) || 0) +
    (parseFloat(f.costo_otros) || 0)

  const resetForm = () => {
    setForm({
      nombre: '', descripcion: '', precio: '', stock: '', imagen_url: '', activo: true,
      categoria: 'general', stock_minimo: '5',
      costo_adquisicion: '', costo_transporte: '', costo_empaque: '', costo_almacenaje: '', costo_comision: '', costo_otros: ''
    })
    setEditando(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const costoTotal = calcCostoTotal(form)
    const data = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      precio: parseFloat(form.precio),
      costo: costoTotal,
      stock: parseInt(form.stock) || 0,
      imagen_url: form.imagen_url,
      activo: form.activo,
      categoria: form.categoria,
      stock_minimo: parseInt(form.stock_minimo) || 5,
      costo_adquisicion: parseFloat(form.costo_adquisicion) || 0,
      costo_transporte: parseFloat(form.costo_transporte) || 0,
      costo_empaque: parseFloat(form.costo_empaque) || 0,
      costo_almacenaje: parseFloat(form.costo_almacenaje) || 0,
      costo_comision: parseFloat(form.costo_comision) || 0,
      costo_otros: parseFloat(form.costo_otros) || 0,
    }
    try {
      let result
      if (editando) {
        result = await supabase.from('productos').update(data).eq('id', editando)
      } else {
        result = await supabase.from('productos').insert(data)
      }
      if (result.error) throw result.error
      await fetchProductos()
      resetForm()
    } catch (err) {
      alert('Error al guardar producto: ' + err.message)
    }
  }

  const handleEdit = (p) => {
    setForm({
      nombre: p.nombre, descripcion: p.descripcion || '', precio: p.precio.toString(), stock: p.stock.toString(),
      imagen_url: p.imagen_url || '', activo: p.activo,
      categoria: p.categoria || 'general', stock_minimo: (p.stock_minimo || 5).toString(),
      costo_adquisicion: (p.costo_adquisicion || 0).toString(),
      costo_transporte: (p.costo_transporte || 0).toString(),
      costo_empaque: (p.costo_empaque || 0).toString(),
      costo_almacenaje: (p.costo_almacenaje || 0).toString(),
      costo_comision: (p.costo_comision || 0).toString(),
      costo_otros: (p.costo_otros || 0).toString(),
    })
    setEditando(p.id)
    setShowForm(true)
  }

  const toggleActivo = async (id, activo) => {
    try {
      const { error } = await supabase.from('productos').update({ activo: !activo }).eq('id', id)
      if (error) throw error
      await fetchProductos()
    } catch (err) {
      alert('Error al cambiar estado: ' + err.message)
    }
  }

  const fmt = (n) => '$' + (n || 0).toFixed(2)
  const calcMargen = (p) => p.costo > 0 ? ((p.precio - p.costo) / p.costo * 100).toFixed(1) : '0.0'
  const calcRotacion = (p) => p.stock > 0 ? (p.unidades_vendidas || 0) / p.stock : 0

  const productosActivos = useMemo(() => productos.filter(p => p.activo), [productos])

  const totalValorVenta = productosActivos.reduce((s, p) => s + p.precio * p.stock, 0)
  const totalCosto = productosActivos.reduce((s, p) => s + (p.costo || 0) * p.stock, 0)
  const totalStock = productosActivos.reduce((s, p) => s + p.stock, 0)
  const stockBajo = productosActivos.filter(p => p.stock <= (p.stock_minimo || 5)).length
  const sinStock = productosActivos.filter(p => p.stock === 0).length
  const margenProm = productosActivos.filter(p => p.costo > 0).reduce((s, p) => s + parseFloat(calcMargen(p)), 0) / (productosActivos.filter(p => p.costo > 0).length || 1)

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      if (busqueda) {
        const q = busqueda.toLowerCase()
        const matchNombre = p.nombre?.toLowerCase().includes(q)
        const matchDesc = p.descripcion?.toLowerCase().includes(q)
        if (!matchNombre && !matchDesc) return false
      }
      if (filtroCategoria !== 'todos' && p.categoria !== filtroCategoria) return false
      if (filtroStock === 'bajo' && p.stock > (p.stock_minimo || 5)) return false
      if (filtroStock === 'sin' && p.stock > 0) return false
      return true
    })
  }, [productos, busqueda, filtroCategoria, filtroStock])

  const costData = [
    { label: 'Adquisición', total: productosActivos.reduce((s, p) => s + (p.costo_adquisicion || 0) * p.stock, 0), color: 'var(--brand)' },
    { label: 'Transporte', total: productosActivos.reduce((s, p) => s + (p.costo_transporte || 0) * p.stock, 0), color: 'var(--info-text)' },
    { label: 'Empaque', total: productosActivos.reduce((s, p) => s + (p.costo_empaque || 0) * p.stock, 0), color: 'var(--warning-text)' },
    { label: 'Almacenaje', total: productosActivos.reduce((s, p) => s + (p.costo_almacenaje || 0) * p.stock, 0), color: 'var(--success-text)' },
    { label: 'Comisión', total: productosActivos.reduce((s, p) => s + (p.costo_comision || 0) * p.stock, 0), color: '#8b5cf6' },
    { label: 'Otros', total: productosActivos.reduce((s, p) => s + (p.costo_otros || 0) * p.stock, 0), color: 'var(--ink-muted)' },
  ]

  const costBreakdown = productosActivos
    .filter(p => p.costo > 0)
    .map(p => ({ ...p, rotacion: calcRotacion(p), margen: parseFloat(calcMargen(p)) }))
    .sort((a, b) => b.margen - a.margen)

  const getCategoriaLabel = (val) => CATEGORIAS.find(c => c.value === val)?.label || val

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--surface-2)] border-t-[var(--brand)]" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em]" style={{ color: 'var(--ink-primary)' }}>Productos e Inventario</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--ink-secondary)' }}>{productosActivos.length} productos activos</p>
        </div>
        <div className="flex items-center gap-2">
          {['tabla', 'costos', 'informe'].map(v => (
            <button key={v} onClick={() => setVista(v)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition"
              style={vista === v ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--ink-secondary)' }}>
              {v === 'tabla' ? 'Tabla' : v === 'costos' ? 'Costos' : 'Informe'}
            </button>
          ))}
          <button onClick={() => { resetForm(); setShowForm(!showForm) }}
            className="bg-[var(--brand)] hover:opacity-90 text-white font-medium px-5 py-2.5 rounded-lg transition text-sm">
            {showForm ? 'Cancelar' : '+ Nuevo'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6">
          <h3 className="text-base font-semibold mb-5" style={{ color: 'var(--ink-primary)' }}>{editando ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink-secondary)' }}>Nombre *</label>
              <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required
                className="w-full px-3.5 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm outline-none focus:border-[var(--brand)]" style={{ color: 'var(--ink-primary)' }} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink-secondary)' }}>Descripción</label>
              <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2}
                className="w-full px-3.5 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm outline-none focus:border-[var(--brand)] resize-none" style={{ color: 'var(--ink-primary)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink-secondary)' }}>Categoría</label>
              <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm outline-none focus:border-[var(--brand)] appearance-none cursor-pointer" style={{ color: 'var(--ink-primary)' }}>
                {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink-secondary)' }}>Precio de venta *</label>
              <input type="number" step="0.01" min="0" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} required
                className="w-full px-3.5 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm outline-none focus:border-[var(--brand)]" style={{ color: 'var(--ink-primary)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink-secondary)' }}>Stock</label>
              <input type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm outline-none focus:border-[var(--brand)]" style={{ color: 'var(--ink-primary)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink-secondary)' }}>Stock mínimo (alerta)</label>
              <input type="number" min="0" value={form.stock_minimo} onChange={e => setForm({ ...form, stock_minimo: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm outline-none focus:border-[var(--brand)]" style={{ color: 'var(--ink-primary)' }} />
            </div>

            <div className="sm:col-span-2 border-t pt-4 mt-2" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>Costos discriminados</label>
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--danger)' }}>Total: {fmt(calcCostoTotal(form))}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {COST_FIELDS.map(cf => (
                  <div key={cf.key}>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: cf.color }}>{cf.label}</label>
                    <input type="number" step="0.01" min="0" value={form[cf.key]}
                      onChange={e => setForm({ ...form, [cf.key]: e.target.value })}
                      className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm outline-none focus:border-[var(--brand)]" style={{ color: 'var(--ink-primary)' }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ink-secondary)' }}>URL de imagen (opcional)</label>
              <input type="url" value={form.imagen_url} onChange={e => setForm({ ...form, imagen_url: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-sm outline-none focus:border-[var(--brand)]" style={{ color: 'var(--ink-primary)' }} placeholder="https://..." />
              {form.imagen_url && (
                <div className="mt-2 flex items-center gap-3">
                  <img src={form.imagen_url} alt="Preview" className="w-16 h-16 object-cover rounded-lg border" style={{ borderColor: 'var(--border)' }}
                    onError={e => e.target.style.display = 'none'} />
                  <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>Preview</span>
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <button type="button" role="switch" aria-checked={form.activo} onClick={() => setForm({ ...form, activo: !form.activo })}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ${form.activo ? 'bg-[var(--brand)]' : 'bg-[var(--ink-muted)]'}`}>
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-150 ${form.activo ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                </button>
                <span className="text-sm font-medium" style={{ color: 'var(--ink-secondary)' }}>Activo</span>
              </label>
            </div>
          </div>
          <button type="submit" className="mt-5 bg-[var(--brand)] hover:opacity-90 text-white font-medium px-6 py-2.5 rounded-lg transition text-sm">
            {editando ? 'Guardar Cambios' : 'Crear Producto'}
          </button>
        </form>
      )}

      {vista === 'tabla' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {[
              { label: 'Valor venta', value: fmt(totalValorVenta), color: 'var(--brand)' },
              { label: 'Costo total', value: fmt(totalCosto), color: 'var(--danger)' },
              { label: 'Margen prom.', value: margenProm.toFixed(1) + '%', color: 'var(--success-text)' },
              { label: 'Stock total', value: totalStock, color: 'var(--ink-primary)' },
              { label: 'Stock bajo', value: stockBajo, color: stockBajo > 0 ? 'var(--warning-text)' : 'var(--success-text)' },
              { label: 'Sin stock', value: sinStock, color: sinStock > 0 ? 'var(--danger)' : 'var(--success-text)' },
            ].map((c, i) => (
              <div key={i} className="p-4 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-muted)' }}>{c.label}</p>
                <p className="text-lg font-bold mt-1 tabular-nums" style={{ color: c.color }}>{c.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o descripción..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm border outline-none"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--ink-primary)' }} />
            </div>
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
              className="px-3 py-2.5 rounded-lg text-sm border appearance-none cursor-pointer"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--ink-primary)' }}>
              <option value="todos">Todas las categorías</option>
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={filtroStock} onChange={e => setFiltroStock(e.target.value)}
              className="px-3 py-2.5 rounded-lg text-sm border appearance-none cursor-pointer"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--ink-primary)' }}>
              <option value="todos">Todo el stock</option>
              <option value="bajo">Stock bajo</option>
              <option value="sin">Sin stock</option>
            </select>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--surface-2)]">
                    <th className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Producto</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Categoría</th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Stock</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--danger)' }}>Costo</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--brand)' }}>Precio</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Margen</th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Estado</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>Acc.</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.map(p => {
                    const margen = parseFloat(calcMargen(p))
                    const stockMin = p.stock_minimo || 5
                    const esBajo = p.stock <= stockMin && p.stock > 0
                    const esSin = p.stock === 0
                    return (
                      <tr key={p.id} className="border-t hover:bg-[var(--hover-subtle)] transition-colors" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {p.imagen_url ? (
                              <img src={p.imagen_url} alt="" className="w-10 h-10 rounded-lg object-cover border" style={{ borderColor: 'var(--border)' }} />
                            ) : (
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
                                <span className="text-lg">📦</span>
                              </div>
                            )}
                            <div>
                              <p className="font-semibold" style={{ color: 'var(--ink-primary)' }}>{p.nombre}</p>
                              {p.descripcion && <p className="text-[10px] truncate max-w-[150px]" style={{ color: 'var(--ink-muted)' }}>{p.descripcion}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'var(--surface-2)', color: 'var(--ink-secondary)' }}>
                            {getCategoriaLabel(p.categoria)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-bold tabular-nums" style={{ color: esSin ? 'var(--danger)' : esBajo ? 'var(--warning-text)' : 'var(--ink-primary)' }}>
                              {p.stock}
                            </span>
                            {esSin && <span className="text-[9px] px-1 py-0.5 rounded font-bold" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>SIN</span>}
                            {esBajo && <span className="text-[9px] px-1 py-0.5 rounded font-bold" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}>MIN</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs" style={{ color: 'var(--danger)' }}>{fmt(p.costo)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs font-semibold" style={{ color: 'var(--brand)' }}>{fmt(p.precio)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{
                            background: margen >= 30 ? 'var(--success-bg)' : margen >= 10 ? 'var(--warning-bg)' : 'var(--danger-bg)',
                            color: margen >= 30 ? 'var(--success-text)' : margen >= 10 ? 'var(--warning-text)' : 'var(--danger)'
                          }}>{margen}%</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleActivo(p.id, p.activo)}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium transition ${p.activo ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'bg-[var(--danger-bg)] text-[var(--danger)]'}`}>
                            {p.activo ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleEdit(p)} className="text-[var(--brand)] font-medium text-xs">Editar</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {productosFiltrados.length === 0 && <div className="py-16 text-center"><p style={{ color: 'var(--ink-muted)' }}>{busqueda || filtroCategoria !== 'todos' || filtroStock !== 'todos' ? 'No se encontraron productos con esos filtros' : 'No hay productos'}</p></div>}
          </div>
        </>
      )}

      {vista === 'costos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink-primary)' }}>Distribución de Costos por Categoría</h3>
              <div className="space-y-3">
                {costData.map((c, i) => {
                  const pct = totalCosto > 0 ? (c.total / totalCosto * 100) : 0
                  return (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium" style={{ color: 'var(--ink-secondary)' }}>{c.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs tabular-nums" style={{ color: 'var(--ink-muted)' }}>{pct.toFixed(1)}%</span>
                          <span className="text-xs font-bold tabular-nums" style={{ color: c.color }}>{fmt(c.total)}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: c.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 pt-3 border-t flex justify-between" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>Total costos</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--danger)' }}>{fmt(totalCosto)}</span>
              </div>
            </div>

            <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink-primary)' }}>Composición de Costo por Producto</h3>
              <div className="space-y-3 max-h-[360px] overflow-y-auto">
                {costBreakdown.slice(0, 10).map(p => {
                  const parts = COST_FIELDS.map(cf => ({ label: cf.label, value: p[cf.key] || 0, color: cf.color }))
                  return (
                    <div key={p.id} className="pb-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-semibold" style={{ color: 'var(--ink-primary)' }}>{p.nombre}</span>
                        <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--danger)' }}>{fmt(p.costo)} <span className="font-normal" style={{ color: 'var(--ink-muted)' }}>({p.margen}% mg)</span></span>
                      </div>
                      <div className="flex gap-0.5 h-3 rounded-full overflow-hidden">
                        {parts.filter(pp => pp.value > 0).map((pp, i) => (
                          <div key={i} style={{ width: `${(pp.value / p.costo) * 100}%`, background: pp.color, minWidth: '2px' }}
                            title={`${pp.label}: ${fmt(pp.value)}`} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {vista === 'informe' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink-primary)' }}>Resumen del Inventario</h3>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-sm" style={{ color: 'var(--ink-secondary)' }}>Productos activos</span><span className="text-sm font-bold" style={{ color: 'var(--ink-primary)' }}>{productosActivos.length}</span></div>
                <div className="flex justify-between"><span className="text-sm" style={{ color: 'var(--ink-secondary)' }}>Productos inactivos</span><span className="text-sm font-bold" style={{ color: 'var(--ink-primary)' }}>{productos.filter(p => !p.activo).length}</span></div>
                <div className="flex justify-between"><span className="text-sm" style={{ color: 'var(--warning-text)' }}>Stock bajo</span><span className="text-sm font-bold" style={{ color: 'var(--warning-text)' }}>{stockBajo}</span></div>
                <div className="flex justify-between border-t pt-3" style={{ borderColor: 'var(--border)' }}><span className="text-sm" style={{ color: 'var(--ink-secondary)' }}>Valor total (venta)</span><span className="text-sm font-bold" style={{ color: 'var(--brand)' }}>{fmt(totalValorVenta)}</span></div>
                <div className="flex justify-between"><span className="text-sm" style={{ color: 'var(--ink-secondary)' }}>Costo total inventario</span><span className="text-sm font-bold" style={{ color: 'var(--danger)' }}>{fmt(totalCosto)}</span></div>
                <div className="flex justify-between border-t pt-3" style={{ borderColor: 'var(--border)' }}><span className="text-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>Ganancia potencial</span><span className="text-sm font-bold" style={{ color: 'var(--success-text)' }}>{fmt(totalValorVenta - totalCosto)}</span></div>
              </div>
            </div>

            <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink-primary)' }}>Mayor Margen</h3>
              <div className="space-y-2">
                {costBreakdown.slice(0, 5).map(p => (
                  <div key={p.id} className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: 'var(--ink-secondary)' }}>{p.nombre}</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--success-text)' }}>{p.margen}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--ink-primary)' }}>Menor Margen</h3>
              <div className="space-y-2">
                {[...costBreakdown].reverse().slice(0, 5).map(p => (
                  <div key={p.id} className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: 'var(--ink-secondary)' }}>{p.nombre}</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--danger)' }}>{p.margen}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}