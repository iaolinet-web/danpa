import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './services/supabase'
import { CartProvider } from './context/CartContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProfileProvider } from './context/ProfileContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Catalogo from './pages/Catalogo'
import Carrito from './pages/Carrito'
import Pedidos from './pages/Pedidos'
import Clientes from './pages/Clientes'
import ClienteDetalle from './pages/ClienteDetalle'
import Recorrida from './pages/Recorrida'
import ProductosAdmin from './pages/ProductosAdmin'
import AdminDashboard from './pages/AdminDashboard'
import UsuariosAdmin from './pages/UsuariosAdmin'
import CobrosAdmin from './pages/CobrosAdmin'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <ThemeProvider>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
          <div className="animate-spin rounded-full h-10 w-10 border-2" style={{ borderColor: 'var(--surface-2)', borderTopColor: 'var(--brand)' }} />
        </div>
      ) : !user ? (
        <Login />
      ) : (
        <ProfileProvider>
          <BrowserRouter>
            <CartProvider>
              <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--ink-primary)' }}>
                <Navbar />
                <main className="max-w-6xl mx-auto px-4 py-8">
                  <Routes>
                    <Route path="/" element={<Catalogo />} />
                    <Route path="/carrito" element={
                      <ProtectedRoute permission="carrito"><Carrito /></ProtectedRoute>
                    } />
                    <Route path="/pedidos" element={
                      <ProtectedRoute permission="pedidos"><Pedidos /></ProtectedRoute>
                    } />
                    <Route path="/clientes" element={
                      <ProtectedRoute permission="clientes"><Clientes /></ProtectedRoute>
                    } />
                    <Route path="/clientes/:id" element={
                      <ProtectedRoute permission="clientes"><ClienteDetalle /></ProtectedRoute>
                    } />
                    <Route path="/recorrida" element={
                      <ProtectedRoute permission="recorrida"><Recorrida /></ProtectedRoute>
                    } />
                    <Route path="/admin/dashboard" element={
                      <ProtectedRoute permission="adminDashboard"><AdminDashboard /></ProtectedRoute>
                    } />
                    <Route path="/admin/productos" element={
                      <ProtectedRoute permission="adminProductos"><ProductosAdmin /></ProtectedRoute>
                    } />
                    <Route path="/admin/usuarios" element={
                      <ProtectedRoute permission="adminUsuarios"><UsuariosAdmin /></ProtectedRoute>
                    } />
                    <Route path="/admin/cobros" element={
                      <ProtectedRoute permission="adminCobros"><CobrosAdmin /></ProtectedRoute>
                    } />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            </CartProvider>
          </BrowserRouter>
        </ProfileProvider>
      )}
    </ThemeProvider>
  )
}
