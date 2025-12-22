import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // extracts the token from the Authorization header
            ignoreExpiration: false, // if true, ignores expiration
            secretOrKey: process.env.JWT_SECRET!, // adding ! guarantees that env exists at runtime
        });
    }

    async validate(payload: any) {
        return { userId: payload.sub, email: payload.email, role: payload.role }; // returns the user object
    }
}
