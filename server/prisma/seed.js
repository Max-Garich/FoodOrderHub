import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create super admin
  const superAdminPassword = await bcrypt.hash('super123', 10);
  await prisma.admin.upsert({
    where: { email: 'superadmin@foodorderhub.ru' },
    update: {},
    create: {
      email: 'superadmin@foodorderhub.ru',
      passwordHash: superAdminPassword,
      name: 'Главный Администратор',
      isSuperAdmin: true,
    },
  });

  // Create default admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.admin.upsert({
    where: { email: 'admin@foodorderhub.ru' },
    update: {},
    create: {
      email: 'admin@foodorderhub.ru',
      passwordHash: adminPassword,
      name: 'Администратор',
      isSuperAdmin: false,
    },
  });

  // Create some sample menu items
  const items = [
    { name: 'Борщ', description: 'Классический борщ со сметаной' },
    { name: 'Котлета с пюре', description: 'Домашняя котлета с картофельным пюре' },
    { name: 'Компот', description: 'Компот из сухофруктов' },
    { name: 'Салат Цезарь', description: 'Салат с курицей и соусом Цезарь' },
    { name: 'Пельмени', description: 'Пельмени домашние со сметаной' },
    { name: 'Чай', description: 'Чай чёрный/зелёный' },
    { name: 'Плов', description: 'Узбекский плов с бараниной' },
    { name: 'Солянка', description: 'Солянка мясная сборная' },
  ];

  for (const item of items) {
    await prisma.menuItem.upsert({
      where: { id: items.indexOf(item) + 1 },
      update: {},
      create: item,
    });
  }

  // Create a test user
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Тестовый Пользователь',
      passwordHash: userPassword,
      passwordPlain: 'user123',
    },
  });

  // Create balance for test user
  await prisma.balance.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      amount: 1000,
    },
  });

  console.log('✅ Seed completed');
  console.log('   Super Admin: superadmin@foodorderhub.ru / super123');
  console.log('   Admin: admin@foodorderhub.ru / admin123');
  console.log('   User:  test@example.com / user123 (balance: 1000₽)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
