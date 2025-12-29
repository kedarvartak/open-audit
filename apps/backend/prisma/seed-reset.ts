import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase() {
    console.log('🗑️  Starting database reset...\n');

    try {
        // Delete in order to respect foreign key constraints
        // Order matters: delete dependent tables first

        console.log('Deleting tasks...');
        const tasksDeleted = await prisma.task.deleteMany();
        console.log(`  ✓ Deleted ${tasksDeleted.count} tasks`);

        console.log('Deleting workspace members...');
        const membersDeleted = await prisma.workspaceMember.deleteMany();
        console.log(`  ✓ Deleted ${membersDeleted.count} workspace members`);

        console.log('Deleting workspaces...');
        const workspacesDeleted = await prisma.workspace.deleteMany();
        console.log(`  ✓ Deleted ${workspacesDeleted.count} workspaces`);

        console.log('Deleting users...');
        const usersDeleted = await prisma.user.deleteMany();
        console.log(`  ✓ Deleted ${usersDeleted.count} users`);

        console.log('\n✅ Database reset complete!');
        console.log('   All data has been removed.\n');

    } catch (error) {
        console.error('❌ Error resetting database:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the reset
resetDatabase()
    .then(() => {
        console.log('Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Reset failed:', error);
        process.exit(1);
    });
