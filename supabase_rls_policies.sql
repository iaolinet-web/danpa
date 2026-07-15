-- =============================================================
-- Migración: Row Level Security (RLS) para todas las tablas
-- Ejecutar en Supabase SQL Editor
-- IMPORTANTE: Revisar y adaptar según la estructura real de la BD
-- =============================================================

-- =====================
-- 1. USUARIOS
-- =====================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer su propio perfil
CREATE POLICY "Usuarios leen su propio perfil"
ON usuarios FOR SELECT
USING (auth.uid() = id);

-- Solo admins pueden ver todos los usuarios
CREATE POLICY "Admins ven todos los usuarios"
ON usuarios FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND perfil = 'admin'
  )
);

-- Solo admins pueden actualizar usuarios
CREATE POLICY "Admins actualizan usuarios"
ON usuarios FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND perfil = 'admin'
  )
);

-- Solo admins pueden insertar usuarios (aunque signUp los crea en auth.users)
CREATE POLICY "Admins insertan usuarios"
ON usuarios FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid() AND perfil = 'admin'
  )
);

-- =====================
-- 2. PRODUCTOS
-- =====================
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer productos activos
CREATE POLICY "Usuarios ven productos activos"
ON productos FOR SELECT
USING (activo = true OR EXISTS (
  SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'admin'
));

-- Solo admins pueden insertar productos
CREATE POLICY "Admins insertan productos"
ON productos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'admin'
  )
);

-- Solo admins pueden actualizar productos
CREATE POLICY "Admins actualizan productos"
ON productos FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'admin'
  )
);

-- =====================
-- 3. CLIENTES
-- =====================
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Corredores ven sus propios clientes; admins ven todos
CREATE POLICY "Corredores ven sus clientes"
ON clientes FOR SELECT
USING (
  corredor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'admin'
  )
);

-- Corredores insertan sus propios clientes
CREATE POLICY "Corredores insertan clientes"
ON clientes FOR INSERT
WITH CHECK (corredor_id = auth.uid());

-- Corredores actualizan sus propios clientes
CREATE POLICY "Corredores actualizan sus clientes"
ON clientes FOR UPDATE
USING (
  corredor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'admin'
  )
);

-- =====================
-- 4. PEDIDOS
-- =====================
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- Corredores ven sus propios pedidos; admins ven todos
CREATE POLICY "Corredores ven sus pedidos"
ON pedidos FOR SELECT
USING (
  corredor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'admin'
  )
);

-- Corredores insertan sus propios pedidos
CREATE POLICY "Corredores insertan pedidos"
ON pedidos FOR INSERT
WITH CHECK (corredor_id = auth.uid());

-- Corredores y admins pueden actualizar pedidos
CREATE POLICY "Corredores actualizan sus pedidos"
ON pedidos FOR UPDATE
USING (
  corredor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'admin'
  )
);

-- =====================
-- 5. PEDIDO_ITEMS
-- =====================
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;

-- Solo lectura/escritura si el pedido pertenece al usuario o es admin
CREATE POLICY "Usuarios ven items de sus pedidos"
ON pedido_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_items.pedido_id
    AND (
      pedidos.corredor_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'admin'
      )
    )
  )
);

CREATE POLICY "Usuarios insertan items en sus pedidos"
ON pedido_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_items.pedido_id
    AND pedidos.corredor_id = auth.uid()
  )
);

-- =====================
-- 6. CLIENTE_NOTAS (ya tiene RLS del migración anterior)
-- Verificar que exista, si no, crearla
-- =====================
-- La tabla ya tiene RLS habilitado y la política
-- "Corredores ven sus propias notas" del archivo
-- supabase_migracion_clientes.sql

-- =====================
-- 7. VISITAS
-- =====================
ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;

-- Corredores ven sus propias visitas; admins ven todas
CREATE POLICY "Corredores ven sus visitas"
ON visitas FOR SELECT
USING (
  corredor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'admin'
  )
);

-- Corredores insertan sus propias visitas
CREATE POLICY "Corredores insertan visitas"
ON visitas FOR INSERT
WITH CHECK (corredor_id = auth.uid());

-- Corredores actualizan sus propias visitas
CREATE POLICY "Corredores actualizan sus visitas"
ON visitas FOR UPDATE
USING (corredor_id = auth.uid());

-- Corredores eliminan sus propias visitas
CREATE POLICY "Corredores eliminan sus visitas"
ON visitas FOR DELETE
USING (corredor_id = auth.uid());

-- =====================
-- 8. MOVIMIENTOS
-- =====================
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden leer movimientos
CREATE POLICY "Admins ven movimientos"
ON movimientos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'admin'
  )
);

-- Solo admins pueden insertar movimientos
CREATE POLICY "Admins insertan movimientos"
ON movimientos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'admin'
  )
);

-- Solo admins pueden eliminar movimientos
CREATE POLICY "Admins eliminan movimientos"
ON movimientos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'admin'
  )
);
