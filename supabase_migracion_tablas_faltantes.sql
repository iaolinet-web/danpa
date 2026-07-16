-- =============================================================
-- Migración: Crear tablas faltantes
-- Ejecutar en Supabase SQL Editor ANTES de las RLS policies
-- =============================================================

-- 1. Tabla movimientos (finanzas del admin)
CREATE TABLE IF NOT EXISTS movimientos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  concepto TEXT NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  categoria TEXT DEFAULT 'general',
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  notas TEXT,
  creado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla visitas (recorrida)
CREATE TABLE IF NOT EXISTS visitas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  corredor_id UUID REFERENCES auth.users(id) NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  estado TEXT NOT NULL CHECK (estado IN ('Completada', 'Saltada')),
  latitud NUMERIC,
  longitud NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (corredor_id, cliente_id, fecha)
);

-- 3. Verificar que la tabla usuarios tenga las columnas necesarias
-- (esto es por si la tabla fue creada manualmente sin estas columnas)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre TEXT DEFAULT '';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil TEXT DEFAULT 'corredor'
  CHECK (perfil IN ('admin', 'corredor', 'catalogo', 'consulta'));
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- 4. Verificar que pedidos tenga las columnas de pago
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS estado_pago TEXT DEFAULT 'no_pagado'
  CHECK (estado_pago IN ('pagado', 'parcial', 'no_pagado'));
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS monto_pagado NUMERIC(12,2) DEFAULT 0;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tipo_pago TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS fecha_pago DATE;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS referencia_pago TEXT;

-- 5. Verificar que productos tenga las columnas de costos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS costo NUMERIC(12,2) DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS costo_adquisicion NUMERIC(12,2) DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS costo_transporte NUMERIC(12,2) DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS costo_empaque NUMERIC(12,2) DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS costo_almacenamiento NUMERIC(12,2) DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS costo_comision NUMERIC(12,2) DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS costo_otros NUMERIC(12,2) DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- 6. Verificar que clientes tenga todas las columnas
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS notas TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS latitud NUMERIC;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS longitud NUMERIC;
