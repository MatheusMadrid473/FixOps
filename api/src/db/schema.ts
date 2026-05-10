import { pgTable, text, uuid, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'MANAGER', 'TECHNICIAN']);

// --- Tabelas de Apoio (Cadastros Base) ---

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: userRoleEnum('role').default('TECHNICIAN').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const equipments = pgTable('equipments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  unitCost: integer('unit_cost').notNull(), // Custo em centavos
  model: text('model'), // Útil para filtros Protheus
  serialNumber: text('serial_number'), // Rastreabilidade de Ativo
});

export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  leaderId: uuid('leader_id').references(() => users.id).notNull(),
});

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  standardTime: integer('standard_time'), // Tempo padrão previsto (minutos)
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
  
  // Campo de Integração (Flag para o futuro)
  protheusId: text('protheus_id'), // ID da OS no Protheus após integração
  status: text('status').default('COMPLETED').notNull(), // PENDING, COMPLETED, INTEGRATED

  createdAt: timestamp('created_at').defaultNow().notNull(),
});