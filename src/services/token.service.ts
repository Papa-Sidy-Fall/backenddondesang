import jwt from "jsonwebtoken";
import { env } from "../config/environment.js";
import { AppError } from "../shared/errors/app-error.js";

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role?: string;
}

export class TokenService {
  signAccessToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
    });
  }

  verifyAccessToken(token: string): AuthTokenPayload {
    try {
      const decoded = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;

      if (typeof decoded.sub !== "string" || typeof decoded.email !== "string") {
        throw new AppError("Invalid token payload", 401, "INVALID_TOKEN");
      }

      return {
        sub: decoded.sub,
        email: decoded.email,
        role: typeof decoded.role === "string" ? decoded.role : undefined,
      };
    } catch {
      throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
    }
  }
}
