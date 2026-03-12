import type { DevLoginDto } from "../dtos/dev/dev-login.dto.js";
import { env } from "../config/environment.js";
import { AppError } from "../shared/errors/app-error.js";
import { TokenService } from "./token.service.js";

export class DevAuthService {
  constructor(private readonly tokenService: TokenService) {}

  login(dto: DevLoginDto): { accessToken: string; user: { email: string } } {
    const configuredEmail = env.devLogs.email.trim().toLowerCase();

    if (dto.email !== configuredEmail || dto.password !== env.devLogs.password) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const accessToken = this.tokenService.signAccessToken({
      sub: "dev-logs",
      email: configuredEmail,
      role: "DEV_LOG",
    });

    return {
      accessToken,
      user: {
        email: configuredEmail,
      },
    };
  }
}
