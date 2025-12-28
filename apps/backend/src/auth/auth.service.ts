import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { WorkspaceRole } from '@prisma/client';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }
    // used to login, checks if user exists and if password is valid
    async validateUser(email: string, pass: string): Promise<any> {
        // fetches complete user record from db including email and hashed password
        const user = await this.prisma.user.findUnique({ where: { email } });
        // if user exists and password is valid (compares incoming password to stored hash)
        if (user && (await bcrypt.compare(pass, user.password))) {
            // returns user record without password
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    // used to login, creates a jwt token
    async login(user: any) {
        // creates a payload with email, id and role
        const payload = { email: user.email, sub: user.id, role: user.role };

        // Get user's workspaces
        const workspaces = await this.prisma.workspace.findMany({
            where: {
                members: {
                    some: { userId: user.id },
                },
            },
            select: {
                id: true,
                name: true,
            },
        });

        // returns access token with user info
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                activeWorkspaceId: user.activeWorkspaceId,
            },
            workspaces,
        };
    }

    // used to register, creates a new user and returns a jwt token
    async register(data: any) {
        // hashes password, 10 salt rounds
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Create user and default workspace in a transaction
        const result = await this.prisma.$transaction(async (prisma) => {
            // Create user
            const user = await prisma.user.create({
                data: {
                    ...data,
                    password: hashedPassword,
                },
            });

            // Create default "Personal" workspace
            const workspace = await prisma.workspace.create({
                data: {
                    name: `${user.name}'s Workspace`,
                    description: 'Personal workspace',
                    ownerId: user.id,
                    members: {
                        create: {
                            userId: user.id,
                            role: WorkspaceRole.OWNER,
                            joinedAt: new Date(),
                        },
                    },
                },
            });

            // Update user with active workspace
            await prisma.user.update({
                where: { id: user.id },
                data: { activeWorkspaceId: workspace.id },
            });

            return { ...user, activeWorkspaceId: workspace.id };
        });

        // returns jwt token
        return this.login(result);
    }

    async updateFcmToken(userId: string, token: string) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { fcmToken: token },
        });
    }
}

