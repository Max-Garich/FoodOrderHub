import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function test() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    const adminCount = await prisma.admin.count();
    console.log('Admin count:', adminCount);
  } catch (e) {
    console.error('❌ Database connection failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
