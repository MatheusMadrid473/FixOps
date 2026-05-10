import { pgTable, text, uuid, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';

// 1. Defina o Enum corretamente
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'MANAGER', 'TECHNICIAN']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  username: text('username').notNull().unique(), // Campo obrigatório
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: userRoleEnum('role').default('TECHNICIAN').notNull(), // Usando o enum criado acima
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const equipments = pgTable('equipments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  unitCost: integer('unit_cost').notNull(), // custo em centavos
});

export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  leaderId: uuid('leader_id').references(() => users.id).notNull(),
});

export const maintenanceLogs = pgTable('maintenance_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  description: text('description'),
  technicianId: uuid('technician_id').references(() => users.id).notNull(),
  groupId: uuid('group_id').references(() => groups.id).notNull(),
  equipmentId: uuid('equipment_id').references(() => equipments.id).notNull(),
  quantity: integer('quantity').notNull(),
  totalCost: integer('total_cost').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  estimatedTime: integer('estimated_time'), // em minutos, útil para o Protheus
  createdAt: timestamp('created_at').defaultNow().notNull(),
});