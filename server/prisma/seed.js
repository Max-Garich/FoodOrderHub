import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ═══ Супер-админ ═══
  await prisma.user.upsert({
    where: { email: 'superadmin@foodorderhub.ru' },
    update: {},
    create: {
      email: 'superadmin@foodorderhub.ru',
      passwordHash: await bcrypt.hash('super123', 10),
      name: 'Главный',
      surname: 'Администратор',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  // ═══ Глава столовой ═══
  await prisma.user.upsert({
    where: { email: 'canteen@foodorderhub.ru' },
    update: {},
    create: {
      email: 'canteen@foodorderhub.ru',
      passwordHash: await bcrypt.hash('canteen123', 10),
      name: 'Ольга',
      surname: 'Иванова',
      role: 'CANTEEN_HEAD',
      status: 'ACTIVE',
    },
  });

  // ═══ Группы ═══
  const groups = [
    { name: 'Группа 101', paymentPhone: '+79001112233', paymentBank: 'Сбербанк' },
    { name: 'Группа 102', paymentPhone: '+79004445566', paymentBank: 'Т-Банк' },
    { name: 'Группа 103', paymentPhone: '+79007778899', paymentBank: 'ВТБ' },
  ];

  for (const g of groups) {
    await prisma.group.upsert({
      where: { name: g.name },
      update: {},
      create: g,
    });
  }

  const group101 = await prisma.group.findUnique({ where: { name: 'Группа 101' } });
  const group102 = await prisma.group.findUnique({ where: { name: 'Группа 102' } });

  // ═══ Менеджеры (участники групп с правами) ═══
  const manager1 = await prisma.user.upsert({
    where: { email: 'manager101@foodorderhub.ru' },
    update: {},
    create: {
      email: 'manager101@foodorderhub.ru',
      passwordHash: await bcrypt.hash('manager123', 10),
      name: 'Дмитрий',
      surname: 'Петров',
      role: 'MANAGER',
      status: 'ACTIVE',
      groupId: group101.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'manager102@foodorderhub.ru' },
    update: {},
    create: {
      email: 'manager102@foodorderhub.ru',
      passwordHash: await bcrypt.hash('manager123', 10),
      name: 'Елена',
      surname: 'Сидорова',
      role: 'MANAGER',
      status: 'ACTIVE',
      groupId: group102.id,
    },
  });

  // ═══ Тестовые юзеры ═══
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash: await bcrypt.hash('user123', 10),
      name: 'Иван',
      surname: 'Тестовый',
      role: 'USER',
      status: 'ACTIVE',
      groupId: group101.id,
    },
  });

  // Pending-юзер (заявка ждёт менеджера)
  await prisma.user.upsert({
    where: { email: 'pending@example.com' },
    update: {},
    create: {
      email: 'pending@example.com',
      passwordHash: await bcrypt.hash('user123', 10),
      name: 'Мария',
      surname: 'Козлова',
      role: 'USER',
      status: 'PENDING',
      groupId: group101.id,
    },
  });

  // Pending-преподаватель (ждёт супер-админа)
  await prisma.user.upsert({
    where: { email: 'teacher@example.com' },
    update: {},
    create: {
      email: 'teacher@example.com',
      passwordHash: await bcrypt.hash('teacher123', 10),
      name: 'Сергей',
      surname: 'Волков',
      role: 'TEACHER',
      status: 'PENDING',
      position: 'Преподаватель математики',
    },
  });

  // Баланс тестовому юзеру и менеджеру
  for (const u of [testUser, manager1]) {
    await prisma.balance.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id, amount: 1000 },
    });
  }

  // ═══ Справочник блюд ═══
  const items = [
    { name: 'Борщ', description: 'Классический борщ со сметаной', category: 'Супы', defaultPrice: 120 },
    { name: 'Солянка', description: 'Солянка мясная сборная', category: 'Супы', defaultPrice: 140 },
    { name: 'Котлета с пюре', description: 'Домашняя котлета с картофельным пюре', category: 'Второе', defaultPrice: 180 },
    { name: 'Плов', description: 'Узбекский плов с бараниной', category: 'Второе', defaultPrice: 200 },
    { name: 'Пельмени', description: 'Пельмени домашние со сметаной', category: 'Второе', defaultPrice: 160 },
    { name: 'Салат Цезарь', description: 'Салат с курицей и соусом Цезарь', category: 'Салаты', defaultPrice: 150 },
    { name: 'Чай', description: 'Чай чёрный/зелёный', category: 'Напитки', defaultPrice: 30 },
    { name: 'Компот', description: 'Компот из сухофруктов', category: 'Напитки', defaultPrice: 40 },
  ];

  for (const item of items) {
    const existing = await prisma.menuItem.findFirst({ where: { name: item.name } });
    if (!existing) {
      await prisma.menuItem.create({ data: item });
    }
  }

  console.log('✅ Seed v2 completed');
  console.log('   Супер-админ:  superadmin@foodorderhub.ru / super123');
  console.log('   Глава столовой: canteen@foodorderhub.ru / canteen123');
  console.log('   Менеджер 101: manager101@foodorderhub.ru / manager123');
  console.log('   Юзер (ACTIVE): test@example.com / user123 (баланс 1000)');
  console.log('   Юзер (PENDING): pending@example.com / user123');
  console.log('   Препод (PENDING): teacher@example.com / teacher123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
