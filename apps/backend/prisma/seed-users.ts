import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedUsers() {
    console.log('🌱 Seeding users...\n');

    try {
        const passwordHash = await bcrypt.hash('pass123', 10);

        // Create client user
        const client = await prisma.user.upsert({
            where: { email: 'client@test.com' },
            update: {},
            create: {
                email: 'client@test.com',
                password: passwordHash,
                name: 'Test Client',
                role: Role.CLIENT,
            },
        });
        console.log(`✓ Created client: ${client.email} (ID: ${client.id})`);

        // Create worker user
        const worker = await prisma.user.upsert({
            where: { email: 'worker@test.com' },
            update: {},
            create: {
                email: 'worker@test.com',
                password: passwordHash,
                name: 'Test Worker',
                role: Role.WORKER,
            },
        });
        console.log(`✓ Created worker: ${worker.email} (ID: ${worker.id})`);

        console.log('\n✅ Seeding complete!');
        console.log('\nTest accounts:');
        console.log('  Client: client@test.com / password123');
        console.log('  Worker: worker@test.com / password123\n');

    } catch (error) {
        console.error('❌ Error seeding users:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seedUsers()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exit(1);
    });
