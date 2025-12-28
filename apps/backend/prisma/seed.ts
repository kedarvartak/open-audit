import { PrismaClient, Role, WorkspaceRole, InviteStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

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
    console.log('✅ Created client:', client.email);

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
    console.log('✅ Created worker:', worker.email);

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
    console.log('✅ Created admin:', admin.email);

    // Create workspaces for each user
    console.log('\n📁 Creating workspaces...');

    // Check if client already has a workspace
    const existingClientWorkspace = await prisma.workspaceMember.findFirst({
        where: { userId: client.id },
    });

    if (!existingClientWorkspace) {
        const clientWorkspace = await prisma.workspace.create({
            data: {
                name: "Test Client's Workspace",
                description: 'Personal workspace for Test Client',
                ownerId: client.id,
                members: {
                    create: {
                        userId: client.id,
                        role: WorkspaceRole.OWNER,
                        inviteStatus: InviteStatus.ACCEPTED,
                        joinedAt: new Date(),
                    },
                },
            },
        });
        await prisma.user.update({
            where: { id: client.id },
            data: { activeWorkspaceId: clientWorkspace.id },
        });
        console.log('✅ Created workspace for client');
    } else {
        console.log('⏭️  Client already has a workspace');
    }

    // Check if worker already has a workspace
    const existingWorkerWorkspace = await prisma.workspaceMember.findFirst({
        where: { userId: worker.id },
    });

    if (!existingWorkerWorkspace) {
        const workerWorkspace = await prisma.workspace.create({
            data: {
                name: "Test Worker's Workspace",
                description: 'Personal workspace for Test Worker',
                ownerId: worker.id,
                members: {
                    create: {
                        userId: worker.id,
                        role: WorkspaceRole.OWNER,
                        inviteStatus: InviteStatus.ACCEPTED,
                        joinedAt: new Date(),
                    },
                },
            },
        });
        await prisma.user.update({
            where: { id: worker.id },
            data: { activeWorkspaceId: workerWorkspace.id },
        });
        console.log('✅ Created workspace for worker');
    } else {
        console.log('⏭️  Worker already has a workspace');
    }

    // Check if admin already has a workspace
    const existingAdminWorkspace = await prisma.workspaceMember.findFirst({
        where: { userId: admin.id },
    });

    if (!existingAdminWorkspace) {
        const adminWorkspace = await prisma.workspace.create({
            data: {
                name: 'Admin Workspace',
                description: 'Admin workspace for managing the platform',
                ownerId: admin.id,
                members: {
                    create: {
                        userId: admin.id,
                        role: WorkspaceRole.OWNER,
                        inviteStatus: InviteStatus.ACCEPTED,
                        joinedAt: new Date(),
                    },
                },
            },
        });
        await prisma.user.update({
            where: { id: admin.id },
            data: { activeWorkspaceId: adminWorkspace.id },
        });
        console.log('✅ Created workspace for admin');
    } else {
        console.log('⏭️  Admin already has a workspace');
    }

    console.log('\n🎉 Seeding complete!');
    console.log('\n📝 Test accounts:');
    console.log('  Client: client@test.com / password123');
    console.log('  Worker: worker@test.com / password123');
    console.log('  Admin:  admin@test.com / password123');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
