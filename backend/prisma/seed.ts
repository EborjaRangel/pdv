import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  const adminEmail = "admin@pdv.local";
  const adminPassword = "admin123";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Administrador",
        role: "ADMIN",
        passwordHash: await hashPassword(adminPassword),
      },
    });
    console.log(`Admin creado: ${adminEmail} / ${adminPassword}`);
  }

  const settings = await prisma.businessSettings.findUnique({
    where: { id: "default" },
  });
  if (!settings) {
    await prisma.businessSettings.create({
      data: { id: "default", restaurantName: "Mi Restaurante" },
    });
  }

  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    const tacos = await prisma.category.create({
      data: { name: "Tacos", sortOrder: 1 },
    });
    const bebidas = await prisma.category.create({
      data: { name: "Bebidas", sortOrder: 2 },
    });
    await prisma.category.create({
      data: { name: "Alimentos", sortOrder: 3 },
    });
    await prisma.dish.createMany({
      data: [
        { name: "Taco al pastor", priceMxn: 25, categoryId: tacos.id },
        { name: "Taco de bistec", priceMxn: 28, categoryId: tacos.id },
        { name: "Agua de horchata", priceMxn: 30, categoryId: bebidas.id },
        { name: "Refresco", priceMxn: 25, categoryId: bebidas.id },
      ],
    });
    console.log("Datos de ejemplo creados");
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
