-- Habilitar la extensión para generar UUIDs si no está habilitada
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Eliminar tablas existentes en orden inverso de dependencias para evitar errores
DROP TABLE IF EXISTS "activity_logs" CASCADE;
DROP TABLE IF EXISTS "kardex" CASCADE;
DROP TABLE IF EXISTS "giveaway_participants" CASCADE;
DROP TABLE IF EXISTS "giveaway_prizes" CASCADE;
DROP TABLE IF EXISTS "giveaways" CASCADE;
DROP TABLE IF EXISTS "product_discounts" CASCADE;
DROP TABLE IF EXISTS "discounts" CASCADE;
DROP TABLE IF EXISTS "coupons" CASCADE;
DROP TABLE IF EXISTS "orders" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "roles" CASCADE;
DROP TABLE IF EXISTS "products" CASCADE;
DROP TABLE IF EXISTS "subcategories" CASCADE;
DROP TABLE IF EXISTS "categories" CASCADE;
DROP TABLE IF EXISTS "brands" CASCADE;
DROP TABLE IF EXISTS "backups" CASCADE;
DROP TABLE IF EXISTS "store_config" CASCADE;
DROP TABLE IF EXISTS "nosotros_page" CASCADE;

-- Crear la tabla de roles
CREATE TABLE "roles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL UNIQUE,
  "permissions" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Activo'
);

-- Crear la tabla de usuarios
CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT,
  "identification" TEXT,
  "phone" JSONB,
  "roleId" UUID NOT NULL REFERENCES "roles"("id"),
  "status" TEXT NOT NULL DEFAULT 'Activo',
  "addresses" JSONB DEFAULT '[]'::jsonb,
  "cart" JSONB DEFAULT '[]'::jsonb,
  "resetPasswordToken" TEXT,
  "resetPasswordExpires" TIMESTAMPTZ,
  "verificationToken" TEXT,
  "verificationTokenExpires" TIMESTAMPTZ,
  "recentlyViewed" JSONB DEFAULT '[]'::jsonb,
  "permissions" JSONB -- This column might be deprecated if logic fully relies on roles, but keeping for now.
);

-- Crear la tabla de marcas
CREATE TABLE "brands" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "logoUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Activo'
);

-- Crear la tabla de categorías
CREATE TABLE "categories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "iconName" TEXT,
  "logoUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Activo'
);

-- Crear la tabla de subcategorías
CREATE TABLE "subcategories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "categoryId" UUID NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'Activo'
);

-- Crear la tabla de productos
CREATE TABLE "products" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "longDescription" TEXT,
  "price" NUMERIC(10, 2) NOT NULL,
  "brandId" UUID REFERENCES "brands"("id") ON DELETE SET NULL,
  "subcategoryId" UUID NOT NULL REFERENCES "subcategories"("id") ON DELETE RESTRICT,
  "saleType" TEXT NOT NULL, -- 'stock' or 'on_demand'
  "image" TEXT NOT NULL,
  "images" JSONB DEFAULT '[]'::jsonb,
  "seller" JSONB,
  "reviews" JSONB DEFAULT '[]'::jsonb,
  "specifications" JSONB,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'Activo',
  "sizes" JSONB,
  "customizationOptions" JSONB
);

-- Crear la tabla de pedidos
CREATE TABLE "orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "customerName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "identification" TEXT,
  "shippingAddress" JSONB,
  "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "subtotal" NUMERIC(10, 2) NOT NULL,
  "discountAmount" NUMERIC(10, 2) NOT NULL DEFAULT 0,
  "taxAmount" NUMERIC(10, 2),
  "taxRate" NUMERIC(5, 2),
  "couponCode" TEXT,
  "total" NUMERIC(10, 2) NOT NULL,
  "status" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "trackingHistory" JSONB NOT NULL,
  "paymentMethod" TEXT
);

-- Crear la tabla de cupones
CREATE TABLE "coupons" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL UNIQUE,
  "type" TEXT NOT NULL,
  "value" NUMERIC(10, 2),
  "uses" INTEGER NOT NULL DEFAULT 0,
  "maxUses" INTEGER,
  "status" TEXT NOT NULL,
  "expiryDate" TIMESTAMPTZ
);

-- Crear la tabla de descuentos
CREATE TABLE "discounts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" NUMERIC(10, 2) NOT NULL,
  "status" TEXT NOT NULL,
  "endDate" TIMESTAMPTZ,
  "uses" INTEGER NOT NULL DEFAULT 0,
  "maxUses" INTEGER
);

-- Tabla de unión para productos y descuentos
CREATE TABLE "product_discounts" (
  "discountId" UUID NOT NULL REFERENCES "discounts"("id") ON DELETE CASCADE,
  "productId" UUID NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  PRIMARY KEY ("discountId", "productId")
);

-- Crear la tabla de sorteos
CREATE TABLE "giveaways" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "entryType" TEXT NOT NULL,
  "minPurchaseAmount" NUMERIC(10, 2),
  "startDate" TIMESTAMPTZ NOT NULL,
  "endDate" TIMESTAMPTZ NOT NULL,
  "status" TEXT NOT NULL,
  "winnerId" UUID REFERENCES "users"("id") ON DELETE SET NULL
);

-- Tabla de unión para premios de sorteos
CREATE TABLE "giveaway_prizes" (
  "giveawayId" UUID NOT NULL REFERENCES "giveaways"("id") ON DELETE CASCADE,
  "productId" UUID NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  PRIMARY KEY ("giveawayId", "productId")
);

-- Tabla de unión para participantes de sorteos
CREATE TABLE "giveaway_participants" (
  "giveawayId" UUID NOT NULL REFERENCES "giveaways"("id") ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  PRIMARY KEY ("giveawayId", "userId")
);

-- Crear la tabla de Kardex
CREATE TABLE "kardex" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "productId" UUID NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "productName" TEXT NOT NULL,
  "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "type" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "balance" INTEGER NOT NULL,
  "notes" TEXT
);

-- Crear la tabla de configuración de la tienda
CREATE TABLE "store_config" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT,
  "description" TEXT,
  "logoUrl" TEXT,
  "baseUrl" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "address" JSONB,
  "currency" JSONB,
  "socials" JSONB,
  "taxRate" NUMERIC(5, 2),
  "paymentGateways" JSONB
);

-- Crear la tabla de la página "Nosotros"
CREATE TABLE "nosotros_page" (
  "id" SERIAL PRIMARY KEY,
  "main" JSONB,
  "pillars" JSONB
);

-- Crear la tabla de backups
CREATE TABLE "backups" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "filename" TEXT NOT NULL
);

-- Crear la tabla de logs de actividad
CREATE TABLE "activity_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "users"("id"),
  "userName" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- INSERTAR DATOS INICIALES --

-- Insertar roles base
INSERT INTO "roles" ("name", "permissions", "status") VALUES
('admin', '{"all": true}', 'Activo'),
('user', '{}', 'Activo');

-- Insertar usuario administrador
-- La contraseña es 'adminpassword'
WITH admin_role AS (
  SELECT id FROM "roles" WHERE name = 'admin'
)
INSERT INTO "users" ("name", "email", "password", "identification", "phone", "roleId", "status", "addresses")
VALUES (
  'Administrador',
  'hacktrickstoreecu@gmail.com',
  '$2b$10$2YGsrUwKQoI6mNjrQIBKWepx2z1pcPCBt./QVWtdJ26f8WWtpr35W',
  '9999999999',
  '{"countryCode": "+593", "number": "987654321"}',
  (SELECT id FROM admin_role),
  'Activo',
  '[{"id": "addr-admin", "name": "Oficina Central", "address": "Av. Principal 456", "city": "Metrópolis", "country": "EE. UU.", "isDefault": true, "postalCode": "54321"}]'::jsonb
);

-- Insertar configuración de la tienda
INSERT INTO "store_config" ("id", "name", "description", "logoUrl", "baseUrl", "contactEmail", "contactPhone", "address", "currency", "socials", "taxRate", "paymentGateways")
VALUES (1, 'HackTrickStore', 'Equipamiento deportivo de alto rendimiento.', 'https://img.icons8.com/dusk/64/online-store.png', 'http://localhost:3000', 'hola@hacktrickstore.com', '+1 (555) 123-4567', '{"city": "Metrópolis", "street": "123 Av. Principal", "country": "EE. UU.", "postalCode": "54321"}', '{"code": "USD", "symbol": "$"}', '{"twitter": "https://twitter.com", "facebook": "https://facebook.com", "linkedin": "", "instagram": "https://instagram.com"}', 15, '{"paypal": {"enabled": true}}');

-- Insertar configuración de la página "Nosotros"
INSERT INTO "nosotros_page" ("id", "main", "pillars")
VALUES (1, '{"p1": "En HackTrickStore, vivimos y respiramos deporte. Nuestra misión es equipar a atletas de todos los niveles con ropa deportiva de alto rendimiento que combine estilo, comodidad y la última tecnología.", "p2": "Desde el campo de fútbol hasta la pista de atletismo, cada artículo de nuestra colección está diseñado para ayudarte a rendir al máximo. Creemos que la ropa adecuada puede inspirar confianza y marcar la diferencia en tu juego.", "title": "Nuestra Pasión es el Deporte", "imageUrl": "https://placehold.co/600x400.png"}', '{"items": [{"icon": "Rocket", "title": "Rendimiento", "description": "Diseñamos ropa deportiva que te ayuda a superar tus límites y alcanzar tu máximo potencial."}, {"icon": "Trophy", "title": "Calidad", "description": "Utilizamos materiales de primera calidad y tecnología de vanguardia para garantizar la durabilidad."}, {"icon": "Sprout", "title": "Pasión", "description": "Somos apasionados por el deporte, y esa pasión se refleja en cada producto que creamos."}], "title": "Nuestros Pilares", "description": "No solo vendemos ropa, promovemos un estilo de vida activo basado en el rendimiento, la calidad y la pasión por el deporte."}');

-- Insertar marcas de ejemplo
INSERT INTO "brands" ("name", "description", "logoUrl", "status") VALUES
('Nike', 'Marca líder mundial en ropa y calzado deportivo.', 'https://placehold.co/100x40.png', 'Activo'),
('Adidas', 'Marca alemana de ropa, calzado y accesorios deportivos.', 'https://placehold.co/100x40.png', 'Activo'),
('Puma', 'Marca alemana de ropa deportiva y de estilo de vida.', 'https://placehold.co/100x40.png', 'Inactivo');

-- Insertar categorías de ejemplo
INSERT INTO "categories" ("name", "description", "iconName", "status") VALUES
('Uniformes de Equipo', 'Camisetas, pantalonetas y medias oficiales y de entrenamiento.', 'Shirt', 'Activo'),
('Ropa de Entrenamiento', 'Prendas diseñadas para el máximo rendimiento.', 'Wind', 'Activo'),
('Accesorios Deportivos', 'Complementa tu equipamiento para el juego.', 'Shield', 'Activo'),
('Calzado', 'Zapatos para diferentes deportes.', 'Footprints', 'Activo');

-- Insertar subcategorías de ejemplo
WITH cat1 AS (SELECT id FROM categories WHERE name = 'Uniformes de Equipo'),
     cat2 AS (SELECT id FROM categories WHERE name = 'Ropa de Entrenamiento'),
     cat3 AS (SELECT id FROM categories WHERE name = 'Accesorios Deportivos'),
     cat4 AS (SELECT id FROM categories WHERE name = 'Calzado')
INSERT INTO "subcategories" ("name", "categoryId", "status") VALUES
('Camisetas de Equipo', (SELECT id FROM cat1), 'Activo'),
('Pantalonetas de Equipo', (SELECT id FROM cat1), 'Activo'),
('Chaquetas y Sudaderas', (SELECT id FROM cat2), 'Activo'),
('Pantalones y Leggings', (SELECT id FROM cat2), 'Activo'),
('Pantalonetas de Entrenamiento', (SELECT id FROM cat2), 'Activo'),
('Medias', (SELECT id FROM cat3), 'Activo'),
('Balones', (SELECT id FROM cat3), 'Activo'),
('Zapatos de Fútbol', (SELECT id FROM cat4), 'Activo');

COMMIT;