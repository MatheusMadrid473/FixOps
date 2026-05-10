import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import 'dotenv/config';
import { eq, ne, sql, desc } from 'drizzle-orm';
import { hash } from 'bcryptjs';

import { db } from './db/index.js';
import { users, equipments, groups, maintenanceLogs, services, serviceLogs,  } from './db/schema.js';

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

// Inicialização do Super Admin

async function bootstrapSuperAdmin() {
  const adminLogin = process.env.DEFAULT_ADMIN_LOGIN;
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;

  if (!adminLogin || !adminPassword || !adminEmail) {
    console.log('[Seed] Variáveis de ambiente incompletas. Ignorando.');
    return;
  }

  try {
    const existingAdmin = await db.select().from(users).where(eq(users.username, adminLogin));
    const hashedPassword = await hash(adminPassword, 10);

    if (existingAdmin.length === 0) {
      // USUÁRIO NÃO EXISTE: CRIA
      await db.insert(users).values({
        name: 'Super Admin',
        username: adminLogin,
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN', 
      });
      console.log('[Seed] Super usuário CRIADO com sucesso a partir do .env.');
    } else {
      // USUÁRIO JÁ EXISTE: ATUALIZA SENHA E EMAIL (Força a alteração do .env pro banco)
      await db.update(users)
        .set({ 
          password: hashedPassword, 
          email: adminEmail 
        })
        .where(eq(users.username, adminLogin));
      console.log('[Seed] Super usuário ATUALIZADO com as credenciais do .env.');
    }
  } catch (error) {
    console.error('[Seed] Erro ao tentar criar/atualizar o Super Admin:', error);
  }
}

// Executa a função na inicialização do servidor
bootstrapSuperAdmin();

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

// --- ROTAS DE GRUPOS/TIMES ---
app.get('/groups', async () => {
  return await db.select().from(groups);
});

app.post('/groups', async (request, reply) => {
  const { role } = request.user as { role: string };
  if (role === 'TECHNICIAN') return reply.status(403).send({ message: 'Acesso negado.' });

  const groupSchema = z.object({
    name: z.string().min(2),
    // Agora o Zod valida que é um array e exige pelo menos 1 especialidade
    specialties: z.array(z.string()).min(1), 
    leaderId: z.string().uuid().nullable().optional(),
  });

  try {
    const data = groupSchema.parse(request.body);
    const [newGroup] = await db.insert(groups).values(data).returning();
    return reply.status(201).send(newGroup);
  } catch (error) {
    return reply.status(400).send({ message: "Erro ao cadastrar grupo." });
  }
});

app.put('/groups/:id', async (request, reply) => {
  const { role } = request.user as { role: string };
  if (role === 'TECHNICIAN') return reply.status(403).send({ message: 'Acesso negado.' });

  const paramsSchema = z.object({ id: z.string().uuid() });
  const bodySchema = z.object({
    name: z.string().min(2),
    // Mesma alteração aqui
    specialties: z.array(z.string()).min(1), 
    leaderId: z.string().uuid().nullable().optional(),
  });

  try {
    const { id } = paramsSchema.parse(request.params);
    const data = bodySchema.parse(request.body);

    const [updated] = await db.update(groups)
      .set(data)
      .where(eq(groups.id, id))
      .returning();

    return reply.send(updated);
  } catch (error) {
    return reply.status(400).send({ message: "Erro ao atualizar grupo." });
  }
});

app.delete('/groups/:id', async (request, reply) => {
  const { role } = request.user as { role: string };
  if (role === 'TECHNICIAN') return reply.status(403).send({ message: 'Acesso negado.' });

  const paramsSchema = z.object({ id: z.string().uuid() });
  try {
    const { id } = paramsSchema.parse(request.params);
    await db.delete(groups).where(eq(groups.id, id));
    return reply.status(204).send();
  } catch (error) {
    return reply.status(400).send({ message: "Erro ao remover grupo." });
  }
});

// --- ROTA EXCLUSIVA PARA VINCULAR/DESVINCULAR MEMBRO DA EQUIPE ---
app.patch('/users/:id/group', async (request, reply) => {
  const { role } = request.user as { role: string };
  if (role === 'TECHNICIAN') return reply.status(403).send({ message: 'Acesso negado.' });

  const paramsSchema = z.object({ id: z.string().uuid() });
  const bodySchema = z.object({
    groupId: z.string().uuid().nullable(), // Aceita UUID ou null (para remover da equipe)
  });

  try {
    const { id } = paramsSchema.parse(request.params);
    const { groupId } = bodySchema.parse(request.body);

    await db.update(users).set({ groupId }).where(eq(users.id, id));
    return reply.send({ message: "Vínculo atualizado com sucesso." });
  } catch (error) {
    return reply.status(400).send({ message: "Erro ao atualizar membro da equipe." });
  }
});

app.get('/users', async () => {
  return await db.select({
    id: users.id,
    name: users.name,
    username: users.username,
    email: users.email,
    role: users.role,
    groupId: users.groupId,
  })
  .from(users)
  .where(ne(users.role, 'ADMIN'));
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


// --- ROTAS DE APONTAMENTO (LOGS) ---
app.get('/logs', async () => {
  return await db
    .select({
      id: serviceLogs.id,
      osNumber: serviceLogs.osNumber,
      equipmentName: equipments.name,
      serviceName: services.name,
      technicianName: users.name,
      startDate: serviceLogs.startDate,
      startTime: serviceLogs.startTime,
      endDate: serviceLogs.endDate,
      endTime: serviceLogs.endTime,
      costCenter: serviceLogs.costCenter,
      notes: serviceLogs.notes,
      groupId: users.groupId,
    })
    .from(serviceLogs)
    .innerJoin(equipments, eq(serviceLogs.equipmentId, equipments.id))
    .innerJoin(services, eq(serviceLogs.serviceId, services.id))
    .innerJoin(users, eq(serviceLogs.userId, users.id));
});

app.post('/logs', async (request, reply) => {
  const logSchema = z.object({
    costCenter: z.string().optional(),
    equipmentId: z.string().uuid(),
    serviceId: z.string().uuid(),
    userId: z.string().uuid(),
    startDate: z.string(),
    startTime: z.string(),
    endDate: z.string(),
    endTime: z.string(),
    notes: z.string().optional(),
  });

  try {
    const data = logSchema.parse(request.body);

    const lastLogs = await db.select()
      .from(serviceLogs)
      .orderBy(desc(serviceLogs.osNumber))
      .limit(1);

    let nextOsNumber = "1";

    if (lastLogs.length > 0 && lastLogs[0].osNumber) {
      const currentNumber = parseInt(lastLogs[0].osNumber, 10);
      if (!isNaN(currentNumber)) {
        nextOsNumber = (currentNumber + 1).toString();
      }
    }

    const [newLog] = await db.insert(serviceLogs).values({
      osNumber: nextOsNumber, // Gerado e injetado pelo backend
      costCenter: data.costCenter,
      equipmentId: data.equipmentId,
      serviceId: data.serviceId,
      userId: data.userId,
      startDate: data.startDate,
      startTime: data.startTime,
      endDate: data.endDate,
      endTime: data.endTime,
      notes: data.notes,
    }).returning();

    return reply.status(201).send(newLog);
  } catch (error) {
    console.error(error);
    return reply.status(400).send({ message: "Erro ao registrar apontamento." });
  }
});

app.put('/logs/:id', async (request, reply) => {
  const paramsSchema = z.object({ id: z.string().uuid() });
  
  const logSchema = z.object({
    costCenter: z.string().optional(),
    equipmentId: z.string().uuid(),
    serviceId: z.string().uuid(),
    userId: z.string().uuid(),
    startDate: z.string(),
    startTime: z.string(),
    endDate: z.string(),
    endTime: z.string(),
    notes: z.string().optional(),
  });

  try {
    const { id } = paramsSchema.parse(request.params);
    const data = logSchema.parse(request.body);

    // Atualização explícita garantindo que osNumber não seja tocado
    const [updated] = await db.update(serviceLogs)
      .set({
        costCenter: data.costCenter,
        equipmentId: data.equipmentId,
        serviceId: data.serviceId,
        userId: data.userId,
        startDate: data.startDate,
        startTime: data.startTime,
        endDate: data.endDate,
        endTime: data.endTime,
        notes: data.notes,
      })
      .where(eq(serviceLogs.id, id))
      .returning();
      
    return reply.send(updated);
  } catch (error) {
    console.error(error);
    return reply.status(400).send({ message: "Erro ao atualizar apontamento." });
  }
});

app.delete('/logs/:id', async (request, reply) => {
  const paramsSchema = z.object({ id: z.string().uuid() });
  try {
    const { id } = paramsSchema.parse(request.params);
    await db.delete(serviceLogs).where(eq(serviceLogs.id, id));
    return reply.status(204).send();
  } catch (error) {
    return reply.status(400).send({ message: "Erro ao remover apontamento." });
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