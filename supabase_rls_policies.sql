-- =============================================================
-- RLS policies con es_admin() para evitar dependencia circular
-- Ejecutar DESPUÉS de supabase_fix_rls.sql
-- =============================================================

-- =====================
-- 1. USUARIOS
-- =====================
-- Primero dropear policies existentes para recrearlas
DROP POLICY IF EXISTS "Usuarios leen su propio perfil" ON usuarios;
DROP POLICY IF EXISTS "Admins ven todos los usuarios" ON usuarios;
DROP POLICY IF EXISTS "Admins actualizan usuarios" ON usuarios;
DROP POLICY IF EXISTS "Admins insertan usuarios" ON usuarios;
DROP POLICY IF EXISTS "Usuarios crean su propio perfil" ON usuarios;

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios leen su propio perfil"
ON usuarios FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins ven todos los usuarios"
ON usuarios FOR SELECT
USING (es_admin(auth.uid()));

CREATE POLICY "Admins actualizan usuarios"
ON usuarios FOR UPDATE
USING (es_admin(auth.uid()));

CREATE POLICY "Admins insertan usuarios"
ON usuarios FOR INSERT
WITH CHECK (es_admin(auth.uid()) OR id = auth.uid());

-- =====================
-- 2. PRODUCTOS
-- =====================
DROP POLICY IF EXISTS "Usuarios ven productos activos" ON productos;
DROP POLICY IF EXISTS "Admins insertan productos" ON productos;
DROP POLICY IF EXISTS "Admins actualizan productos" ON productos;

ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven productos activos"
ON productos FOR SELECT
USING (activo = true OR es_admin(auth.uid()));

CREATE POLICY "Admins insertan productos"
ON productos FOR INSERT
WITH CHECK (es_admin(auth.uid()));

CREATE POLICY "Admins actualizan productos"
ON productos FOR UPDATE
USING (es_admin(auth.uid()));

-- =====================
-- 3. CLIENTES
-- =====================
DROP POLICY IF EXISTS "Corredores ven sus clientes" ON clientes;
DROP POLICY IF EXISTS "Corredores insertan clientes" ON clientes;
DROP POLICY IF EXISTS "Corredores actualizan sus clientes" ON clientes;

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corredores ven sus clientes"
ON clientes FOR SELECT
USING (corredor_id = auth.uid() OR es_admin(auth.uid()));

CREATE POLICY "Corredores insertan clientes"
ON clientes FOR INSERT
WITH CHECK (corredor_id = auth.uid());

CREATE POLICY "Corredores actualizan sus clientes"
ON clientes FOR UPDATE
USING (corredor_id = auth.uid() OR es_admin(auth.uid()));

-- =====================
-- 4. PEDIDOS
-- =====================
DROP POLICY IF EXISTS "Corredores ven sus pedidos" ON pedidos;
DROP POLICY IF EXISTS "Corredores insertan pedidos" ON pedidos;
DROP POLICY IF EXISTS "Corredores actualizan sus pedidos" ON pedidos;

ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corredores ven sus pedidos"
ON pedidos FOR SELECT
USING (corredor_id = auth.uid() OR es_admin(auth.uid()));

CREATE POLICY "Corredores insertan pedidos"
ON pedidos FOR INSERT
WITH CHECK (corredor_id = auth.uid());

CREATE POLICY "Corredores actualizan sus pedidos"
ON pedidos FOR UPDATE
USING (corredor_id = auth.uid() OR es_admin(auth.uid()));

-- =====================
-- 5. PEDIDO_ITEMS
-- =====================
DROP POLICY IF EXISTS "Usuarios ven items de sus pedidos" ON pedido_items;
DROP POLICY IF EXISTS "Usuarios insertan items en sus pedidos" ON pedido_items;

ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven items de sus pedidos"
ON pedido_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_items.pedido_id
    AND (pedidos.corredor_id = auth.uid() OR es_admin(auth.uid()))
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
-- 6. VISITAS
-- =====================
DROP POLICY IF EXISTS "Corredores ven sus visitas" ON visitas;
DROP POLICY IF EXISTS "Corredores insertan visitas" ON visitas;
DROP POLICY IF EXISTS "Corredores actualizan sus visitas" ON visitas;
DROP POLICY IF EXISTS "Corredores eliminan sus visitas" ON visitas;

ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corredores ven sus visitas"
ON visitas FOR SELECT
USING (corredor_id = auth.uid() OR es_admin(auth.uid()));

CREATE POLICY "Corredores insertan visitas"
ON visitas FOR INSERT
WITH CHECK (corredor_id = auth.uid());

CREATE POLICY "Corredores actualizan sus visitas"
ON visitas FOR UPDATE
USING (corredor_id = auth.uid());

CREATE POLICY "Corredores eliminan sus visitas"
ON visitas FOR DELETE
USING (corredor_id = auth.uid());

-- =====================
-- 7. MOVIMIENTOS
-- =====================
DROP POLICY IF EXISTS "Admins ven movimientos" ON movimientos;
DROP POLICY IF EXISTS "Admins insertan movimientos" ON movimientos;
DROP POLICY IF EXISTS "Admins eliminan movimientos" ON movimientos;

ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins ven movimientos"
ON movimientos FOR SELECT
USING (es_admin(auth.uid()));

CREATE POLICY "Admins insertan movimientos"
ON movimientos FOR INSERT
WITH CHECK (es_admin(auth.uid()));

CREATE POLICY "Admins eliminan movimientos"
ON movimientos FOR DELETE
USING (es_admin(auth.uid()));

-- =====================
-- 8. CLIENTE_NOTAS
-- =====================
-- Ya tiene RLS, pero verificar la política
DROP POLICY IF EXISTS "Corredores ven sus propias notas" ON cliente_notas;

ALTER TABLE cliente_notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Corredores ven sus propias notas"
ON cliente_notas FOR ALL
USING (corredor_id = auth.uid());
