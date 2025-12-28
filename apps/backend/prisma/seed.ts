import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create a test client
    const client = await prisma.user.upsert({
        where: { email: 'client@test.com' },
        update: {},
        create: {
            email: 'client@test.com',
            password: hashedPassword,
            name: 'Test Client',
            role: Role.CLIENT,
            rating: 4.5,
        },
    });
    console.log('Created client:', client.email);

    // Create a test worker
    const worker = await prisma.user.upsert({
        where: { email: 'worker@test.com' },
        update: {},
        create: {
            email: 'worker@test.com',
            password: hashedPassword,
            name: 'Test Worker',
            role: Role.WORKER,
            rating: 4.8,
        },
    });
    console.log('Created worker:', worker.email);

    // Create an admin
    const admin = await prisma.user.upsert({
        where: { email: 'admin@test.com' },
        update: {},
        create: {
            email: 'admin@test.com',
            password: hashedPassword,
            name: 'Admin User',
            role: Role.ADMIN,
            rating: 5.0,
        },
    });
    console.log('Created admin:', admin.email);

    console.log('\n✅ Seeding complete!');
    console.log('\nTest accounts:');
    console.log('  Client: client@test.com / password123');
    console.log('  Worker: worker@test.com / password123');
    console.log('  Admin:  admin@test.com / password123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
