import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
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
        // returns access token
        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    // used to register, creates a new user and returns a jwt token
    async register(data: any) {
        // hashes password, 10 salt rounds
        const hashedPassword = await bcrypt.hash(data.password, 10);
        // creates user in db
        const user = await this.prisma.user.create({
            data: {
                ...data,
                password: hashedPassword,
            },
        });
        // returns jwt token
        return this.login(user);
    }
}
