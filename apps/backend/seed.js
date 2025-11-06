// seed.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createSuperAdmin() {
  try {
    // Use phone since it's unique
    const existingAdmin = await prisma.user.findUnique({
      where: { phone: process.env.SUPER_ADMIN_PHONE },
    });

    if (existingAdmin) {
      console.log('Super admin already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD, 10);

    const superAdmin = await prisma.user.create({
      data: {
        name: process.env.SUPER_ADMIN_NAME,
        phone: process.env.SUPER_ADMIN_PHONE,
        email: process.env.SUPER_ADMIN_EMAIL,
        password: hashedPassword,
        role: 'superadmin',
        status: 'active',
      },
    });

    console.log('Super admin created successfully:', superAdmin);
    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
