import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import 'dotenv/config';
import { eq, ne, sql } from 'drizzle-orm';

import { db } from './db/index.js';
import { users, equipments, groups, maintenanceLogs, services } from './db/schema.js';

const app = fastify();

// Configurações
app.register(cors, { 
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
});

app.register(jwt, { secret: process.env.JWT_SECRET! });

// Middleware de Autenticação
app.addHook('preHandler', async (request, reply) => {
  const { url, method } = request;

  // Rotas públicas
  if (url === '/login' || (url === '/users' && method === 'POST') || url === '/users/update-password') {
    return;
  }

  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({ message: 'Token ausente ou inválido.' });
  }
});

// --- ROTAS DE USUÁRIO E AUTENTICAÇÃO ---

app.post('/users', async (request, reply) => {
  const createUserSchema = z.object({
    name: z.string().min(3),
    username: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['ADMIN', 'MANAGER', 'TECHNICIAN']).default('TECHNICIAN'),
  });

  const { name, username, email, password, role } = createUserSchema.parse(request.body);

  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser) {
    return reply.status(409).send({ message: 'E-mail já cadastrado.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const [newUser] = await db.insert(users).values({
    name,
    username,
    email,
    password: hashedPassword,
    role,
  }).returning({
    id: users.id,
    name: users.name,
    username: users.username,
    email: users.email,
    role: users.role,
  });

  return reply.status(201).send(newUser);
});

app.post('/login', async (request, reply) => {
  const loginSchema = z.object({
    username: z.string(),
    password: z.string(),
  });

  const { username, password } = loginSchema.parse(request.body);

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  
  if (!user) {
    return reply.status(401).send({ message: 'Usuário ou senha inválidos.' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return reply.status(401).send({ message: 'Usuário ou senha inválidos.' });
  }

  const token = app.jwt.sign({ 
    sub: user.id, 
    role: user.role,
    name: user.name 
  }, { expiresIn: '7d' });

  return reply.send({ 
    token, 
    user: { 
      id: user.id, 
      name: user.name, 
      role: user.role,
      username: user.username,
      email: user.email
    } 
  });
});

app.patch('/users/update-password', async (request, reply) => {
  try {
    const { username, currentPassword, newPassword } = z.object({
      username: z.string(),
      currentPassword: z.string(),
      newPassword: z.string().min(6)
    }).parse(request.body);

    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (!user) {
      return reply.status(404).send({ message: "Usuário não encontrado." });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return reply.status(401).send({ message: "Senha atual incorreta." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, username));

    return reply.send({ message: "Senha atualizada com sucesso!" });
  } catch (error) {
    console.error("[Update Password Error]:", error);
    return reply.status(500).send({ message: "Erro interno ao atualizar senha." });
  }
});

// --- ROTAS DE GESTÃO ---

app.get('/equipments', async () => {
  return await db.select().from(equipments);
});

app.post('/equipments', async (request, reply) => {
  const { role } = request.user as { role: string };
  if (role === 'TECHNICIAN') return reply.status(403).send({ message: 'Acesso negado.' });

  const equipmentSchema = z.object({
    name: z.string(),
    sku: z.string(),
    category: z.string(),
    unit: z.string(),
    unitCost: z.number().int(),
  });

  try {
    const data = equipmentSchema.parse(request.body);
    const [newEquipment] = await db.insert(equipments).values(data).returning();
    return reply.status(201).send(newEquipment);
  } catch (error) {
    return reply.status(400).send({ message: "Erro ao cadastrar equipamento." });
  }
});

// Atualizar Equipamento
app.put('/equipments/:id', async (request, reply) => {
  const { role } = request.user as { role: string };
  if (role === 'TECHNICIAN') return reply.status(403).send({ message: 'Acesso negado.' });

  const paramsSchema = z.object({ id: z.string().uuid() });
  const bodySchema = z.object({
    name: z.string(),
    sku: z.string(),
    category: z.string(),
    unit: z.string(),
    unitCost: z.number().int(),
  });

  try {
    const { id } = paramsSchema.parse(request.params);
    const data = bodySchema.parse(request.body);

    const [updated] = await db.update(equipments)
      .set(data)
      .where(eq(equipments.id, id))
      .returning();

    return reply.send(updated);
  } catch (error) {
    return reply.status(400).send({ message: "Erro ao atualizar equipamento." });
  }
});


app.get('/groups', async () => {
  return await db.select().from(groups);
});

app.post('/groups', async (request, reply) => {
  const { role } = request.user as { role: string };
  if (role === 'TECHNICIAN') return reply.status(403).send({ message: 'Acesso negado.' });

  const groupSchema = z.object({
    name: z.string(),
    leaderId: z.string().uuid(),
  });

  const data = groupSchema.parse(request.body);
  const [newGroup] = await db.insert(groups).values(data).returning();
  return reply.status(201).send(newGroup);
});

app.get('/users', async () => {
  return await db.select({
    id: users.id,
    name: users.name,
    username: users.username,
    email: users.email,
    role: users.role
  })
  .from(users)
  .where(ne(users.role, 'ADMIN'));
});

// Criar Apontamento (Ordem de Serviço)
app.post('/logs', async (request, reply) => {
  const logSchema = z.object({
    description: z.string().optional(),
    technicianId: z.string().uuid(),
    groupId: z.string().uuid(),
    equipmentId: z.string().uuid(),
    serviceId: z.string().uuid().optional(),
    quantity: z.number().int().min(1),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  });

  try {
    const { 
      description, 
      technicianId, 
      groupId, 
      equipmentId, 
      serviceId, 
      quantity, 
      startDate, 
      endDate 
    } = logSchema.parse(request.body);

    const [equipment] = await db.select()
      .from(equipments)
      .where(eq(equipments.id, equipmentId))
      .limit(1);

    if (!equipment) {
      return reply.status(404).send({ message: 'Equipamento não encontrado.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    const unitCostAtTime = equipment.unitCost;
    const totalCost = unitCostAtTime * quantity;

    const [newLog] = await db.insert(maintenanceLogs).values({
      description,
      technicianId,
      groupId,
      equipmentId,
      serviceId,
      quantity,
      unitCostAtTime,
      totalCost,
      startDate: start,
      endDate: end,
      totalMinutes,
      status: 'COMPLETED',
    }).returning();

    return reply.status(201).send(newLog);
  } catch (error) {
    console.error("[Log Create Error]:", error);
    return reply.status(400).send({ message: "Erro ao criar apontamento." });
  }
});

// Listar todos os Apontamentos com Join
app.get('/logs', async () => {
  const result = await db.select({
    id: maintenanceLogs.id,
    description: maintenanceLogs.description,
    technicianName: users.name,
    equipmentName: equipments.name,
    groupName: groups.name,
    quantity: maintenanceLogs.quantity,
    totalCost: maintenanceLogs.totalCost,
    createdAt: maintenanceLogs.createdAt,
    startDate: maintenanceLogs.startDate,
    endDate: maintenanceLogs.endDate,
    totalMinutes: maintenanceLogs.totalMinutes,
  })
  .from(maintenanceLogs)
  .leftJoin(users, eq(maintenanceLogs.technicianId, users.id))
  .leftJoin(equipments, eq(maintenanceLogs.equipmentId, equipments.id))
  .leftJoin(groups, eq(maintenanceLogs.groupId, groups.id))
  .orderBy(sql`${maintenanceLogs.createdAt} DESC`);

  return result;
});

// Rota para Atualizar Usuário
app.put('/users/:id', async (request, reply) => {
  const updateUserParams = z.object({
    id: z.string().uuid(),
  });

  const updateUserBody = z.object({
    name: z.string().min(3),
    username: z.string().min(3),
    email: z.string().email(),
    role: z.enum(['ADMIN', 'MANAGER', 'TECHNICIAN']),
  });

  try {
    const { id } = updateUserParams.parse(request.params);
    const { name, username, email, role } = updateUserBody.parse(request.body);

    // Verifica se o usuário existe
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      return reply.status(404).send({ message: 'Usuário não encontrado.' });
    }

    // Verifica se o novo username ou email já está sendo usado por OUTRO usuário
    // (Isso evita erro de duplicidade no banco)
    const [existingConflict] = await db.select()
      .from(users)
      .where(
        sql`(${eq(users.email, email)} OR ${eq(users.username, username)}) AND ${ne(users.id, id)}`
      )
      .limit(1);

    if (existingConflict) {
      return reply.status(409).send({ message: 'E-mail ou Username já em uso por outro colaborador.' });
    }

    // Executa o Update
    const [updatedUser] = await db.update(users)
      .set({ name, username, email, role })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        role: users.role,
      });

    console.log(`=> Usuário atualizado: ${updatedUser.username}`);
    return reply.send(updatedUser);

  } catch (error) {
    console.error("[Update User Error]:", error);
    return reply.status(400).send({ message: 'Erro ao atualizar dados do usuário.' });
  }
});

// --- ROTAS DE EQUIPAMENTOS (COMPLEMENTO) ---

// Remover Equipamento
app.delete('/equipments/:id', async (request, reply) => {
  const { role } = request.user as { role: string };
  if (role === 'TECHNICIAN') return reply.status(403).send({ message: 'Acesso negado.' });

  const paramsSchema = z.object({ id: z.string().uuid() });

  try {
    const { id } = paramsSchema.parse(request.params);
    
    // O Drizzle retornará um array vazio se não deletar nada
    await db.delete(equipments).where(eq(equipments.id, id));
    
    return reply.status(204).send();
  } catch (error) {
    return reply.status(400).send({ message: "Erro ao remover equipamento. Verifique se existem logs vinculados." });
  }
});


// --- ROTAS DE SERVIÇOS ---
app.get('/services', async () => {
  return await db.select().from(services);
});

app.post('/services', async (request, reply) => {
  const { role } = request.user as { role: string };
  if (role === 'TECHNICIAN') return reply.status(403).send({ message: 'Acesso negado.' });

  const serviceSchema = z.object({
    name: z.string(),
    category: z.string(),
    estimatedTime: z.number().int(),
  });

  try {
    const data = serviceSchema.parse(request.body);
    const [newService] = await db.insert(services).values(data).returning();
    return reply.status(201).send(newService);
  } catch (error) {
    return reply.status(400).send({ message: "Erro ao cadastrar serviço." });
  }
});

app.put('/services/:id', async (request, reply) => {
  const { role } = request.user as { role: string };
  if (role === 'TECHNICIAN') return reply.status(403).send({ message: 'Acesso negado.' });

  const paramsSchema = z.object({ id: z.string().uuid() });
  const bodySchema = z.object({
    name: z.string(),
    category: z.string(),
    estimatedTime: z.number().int(),
  });

  try {
    const { id } = paramsSchema.parse(request.params);
    const data = bodySchema.parse(request.body);

    const [updated] = await db.update(services).set(data).where(eq(services.id, id)).returning();
    return reply.send(updated);
  } catch (error) {
    return reply.status(400).send({ message: "Erro ao atualizar serviço." });
  }
});

app.delete('/services/:id', async (request, reply) => {
  const { role } = request.user as { role: string };
  if (role === 'TECHNICIAN') return reply.status(403).send({ message: 'Acesso negado.' });

  const paramsSchema = z.object({ id: z.string().uuid() });
  try {
    const { id } = paramsSchema.parse(request.params);
    await db.delete(services).where(eq(services.id, id));
    return reply.status(204).send();
  } catch (error) {
    return reply.status(400).send({ message: "Erro ao remover serviço." });
  }
});



// Iniciar o servidor ------------------------------------------------

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`[Server] FixOps HTTP Server running on port ${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();