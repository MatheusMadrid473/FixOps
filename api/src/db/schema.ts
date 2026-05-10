import { AnyPgColumn, pgTable, text, uuid, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'MANAGER', 'TECHNICIAN']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: userRoleEnum('role').default('TECHNICIAN').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  groupId: uuid('group_id').references((): AnyPgColumn => groups.id),
});

// db/schema.ts
export const equipments = pgTable('equipments', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').unique(), // Código interno ou part number
  category: text('category').notNull(), // Pneus, Lubrificantes, Filtros, etc.
  unit: text('unit').default('UN'), // UN, L, KG, M
  unitCost: integer('unit_cost').notNull(),
  minStock: integer('min_stock').default(0), // Alerta de estoque baixo
  createdAt: timestamp('created_at').defaultNow(),
});

export const groups = pgTable('groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  // Transformamos de um simples text() para um array de text()
  specialties: text('specialties').array().notNull(), 
  leaderId: uuid('leader_id').references(() => users.id as AnyPgColumn),
  createdAt: timestamp('created_at').defaultNow(),
});

export const services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  estimatedTime: integer('estimated_time').notNull(), // Tempo em minutos
  createdAt: timestamp('created_at').defaultNow(),
});

// --- Tabela Principal de Apontamento (Foco em Integração ERP) ---

export const maintenanceLogs = pgTable('maintenance_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  description: text('description'),
  
  // Relacionamentos
  technicianId: uuid('technician_id').references(() => users.id).notNull(),
  groupId: uuid('group_id').references(() => groups.id).notNull(),
  equipmentId: uuid('equipment_id').references(() => equipments.id).notNull(),
  serviceId: uuid('service_id').references(() => services.id), // Referência ao catálogo

  // Dados de Insumos
  quantity: integer('quantity').notNull().default(1),
  unitCostAtTime: integer('unit_cost_at_time').notNull(), // Valor do item no momento da OS
  totalCost: integer('total_cost').notNull(),

  // Campos de Tempo (Estrutura Protheus/TOTVS)
  startDate: timestamp('start_date').notNull(), // Data e Hora de início
  endDate: timestamp('end_date').notNull(),   // Data e Hora de término
  totalMinutes: integer('total_minutes').notNull(), // Calculado: (End - Start) em minutos
  
  protheusId: text('protheus_id'), // ID da OS no Protheus após integração
  status: text('status').default('COMPLETED').notNull(), // PENDING, COMPLETED, INTEGRATED

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const serviceLogs = pgTable('service_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  osNumber: text('os_number').notNull(), 
  
  costCenter: text('cost_center'), 
  notes: text('notes'),

  equipmentId: uuid('equipment_id').references(() => equipments.id as AnyPgColumn).notNull(),
  serviceId: uuid('service_id').references(() => services.id as AnyPgColumn).notNull(),
  userId: uuid('user_id').references(() => users.id as AnyPgColumn).notNull(),

  startDate: text('start_date').notNull(),
  startTime: text('start_time').notNull(),
  endDate: text('end_date').notNull(),
  endTime: text('end_time').notNull(),
  
  createdAt: timestamp('created_at').defaultNow(),
});