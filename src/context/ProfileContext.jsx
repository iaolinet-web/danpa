import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

const ProfileContext = createContext()

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

const PERMISOS = {
  admin:     { catalogo: true, carrito: true, clientes: true, pedidos: true, recorrida: true, adminProductos: true, adminUsuarios: true, adminDashboard: true, adminCobros: true },
  corredor:  { catalogo: true, carrito: true, clientes: true, pedidos: true, recorrida: true, adminProductos: false, adminUsuarios: false },
  catalogo:  { catalogo: true, carrito: false, clientes: false, pedidos: false, recorrida: false, adminProductos: true, adminUsuarios: false },
  consulta:  { catalogo: true, carrito: false, clientes: false, pedidos: false, recorrida: false, adminProductos: false, adminUsuarios: false },
}

const PERFIL_LABELS = {
  admin: 'Administrador',
  corredor: 'Corredor/Vendedor',
  catalogo: 'Gestor de Catálogo',
  consulta: 'Solo Consulta',
}

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    if (!userId) {
      setProfile(null)
      setLoading(false)
      return
    }

    const { data: authUser } = await supabase.auth.getUser()
    const email = authUser?.user?.email || ''
    const esAdmin = email === ADMIN_EMAIL

    const { data, error: _fetchError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (!data) {
      const perfilInicial = esAdmin ? 'admin' : 'corredor'
      const { error: insertError } = await supabase.from('usuarios').insert({
        id: userId,
        email,
        nombre: '',
        perfil: perfilInicial,
        activo: true,
      })
      if (insertError) {
        console.error('[ProfileContext] INSERT FAILED:', insertError.message)
        setProfile({
          id: userId,
          email,
          nombre: '',
          perfil: esAdmin ? 'admin' : 'corredor',
          activo: true,
          permisos: esAdmin ? PERMISOS.admin : PERMISOS.corredor,
        })
        setLoading(false)
        return
      }

      const { data: newData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (newData) {
        setProfile({
          ...newData,
          permisos: PERMISOS[newData.perfil] || PERMISOS.consulta,
        })
      } else {
        setProfile({
          id: userId,
          email,
          nombre: '',
          perfil: esAdmin ? 'admin' : 'corredor',
          activo: true,
          permisos: esAdmin ? PERMISOS.admin : PERMISOS.corredor,
        })
      }
    } else {
      if (esAdmin && data.perfil !== 'admin') {
        await supabase.from('usuarios').update({ perfil: 'admin' }).eq('id', userId)
        data.perfil = 'admin'
      }
      setProfile({
        ...data,
        permisos: PERMISOS[data.perfil] || PERMISOS.consulta,
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const hasPermission = (perm) => {
    return profile?.permisos?.[perm] ?? false
  }

  return (
    <ProfileContext.Provider value={{ profile, loading, hasPermission, fetchProfile, PERFIL_LABELS, PERMISOS }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
