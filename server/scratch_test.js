import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testConnection() {
  try {
    const user = await prisma.user.findFirst();
    console.log("Connected to DB, user:", user);
  } catch (error) {
    console.error("Error connecting to DB:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
