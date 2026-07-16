-- =============================================================
-- FIX: función security definer para evitar dependencia circular
-- Ejecutar en Supabase SQL Editor ANTES de re-aplicar RLS
-- =============================================================

-- Primero, deshabilitar RLS temporalmente para poder consultar
-- La función security definer bypassa RLS automáticamente

CREATE OR REPLACE FUNCTION public.es_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = uid AND perfil = 'admin'
  );
$$;

-- Dar permiso de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.es_admin(UUID) TO authenticated;
