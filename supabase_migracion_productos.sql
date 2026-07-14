-- Migración: Mejoras al módulo de Productos
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna categoría
ALTER TABLE productos
ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'general';

-- 2. Agregar columna stock mínimo para alertas
ALTER TABLE productos
ADD COLUMN IF NOT EXISTS stock_minimo INTEGER DEFAULT 5;

-- 3. Índices para mejorar rendimiento de búsquedas
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);

-- 4. Actualizar productos existentes
UPDATE productos SET categoria = 'general' WHERE categoria IS NULL;
UPDATE productos SET stock_minimo = 5 WHERE stock_minimo IS NULL;