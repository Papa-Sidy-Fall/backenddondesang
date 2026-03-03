import { randomUUID } from "node:crypto";
import { AuthProvider } from "../domain/enums/auth-provider.enum.js";
import type { User } from "../domain/entities/user.entity.js";
import type { AuthResponseDto } from "../dtos/auth/auth-response.dto.js";
import type { GoogleIdentityPayload } from "../dtos/auth/google-oauth.dto.js";
import type { LoginDonorDto } from "../dtos/auth/login-donor.dto.js";
import type { RegisterDonorDto } from "../dtos/auth/register-donor.dto.js";
import { toUserResponseDto } from "../dtos/auth/user-response.dto.js";
import { AppError } from "../shared/errors/app-error.js";
import { AppLogger } from "../shared/logging/app-logger.js";
import type { IUserRepository } from "../repositories/interfaces/user-repository.interface.js";
import { PasswordHashService } from "./password-hash.service.js";
import { TokenService } from "./token.service.js";

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHashService: PasswordHashService,
    private readonly tokenService: TokenService,
    private readonly logger: AppLogger
  ) {}

  async registerDonor(dto: RegisterDonorDto): Promise<AuthResponseDto> {
    const existing = await this.userRepository.findByEmail(dto.email);

    if (existing) {
      throw new AppError("Email already used", 409, "EMAIL_ALREADY_USED");
    }

    const passwordHash = await this.passwordHashService.hash(dto.password);

    const user = await this.userRepository.create({
      id: randomUUID(),
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      birthDate: dto.birthDate,
      bloodType: dto.bloodType,
      city: dto.city,
      district: dto.district,
      passwordHash,
      authProvider: AuthProvider.LOCAL,
    });

    this.logger.info("Donor registered", { userId: user.id, email: user.email });

    return this.buildAuthResponse(user.id, user.email, user);
  }

  async loginDonor(dto: LoginDonorDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    if (!user.passwordHash) {
      throw new AppError(
        "This account uses OAuth2 login. Use Google authentication.",
        400,
        "PASSWORD_LOGIN_NOT_AVAILABLE"
      );
    }

    const isPasswordValid = await this.passwordHashService.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    this.logger.info("Donor logged in", { userId: user.id, email: user.email });

    return this.buildAuthResponse(user.id, user.email, user);
  }

  async loginWithGoogle(identity: GoogleIdentityPayload): Promise<AuthResponseDto> {
    const existingByGoogleId = await this.userRepository.findByGoogleId(identity.googleId);

    if (existingByGoogleId) {
      this.logger.info("OAuth2 login success", {
        provider: "google",
        userId: existingByGoogleId.id,
      });
      return this.buildAuthResponse(
        existingByGoogleId.id,
        existingByGoogleId.email,
        existingByGoogleId
      );
    }

    const existingByEmail = await this.userRepository.findByEmail(identity.email);

    if (existingByEmail) {
      await this.userRepository.attachGoogleIdentity(existingByEmail.id, identity.googleId);
      const linked = await this.userRepository.findById(existingByEmail.id);

      if (!linked) {
        throw new AppError("Unable to link OAuth account", 500, "OAUTH_LINK_ERROR");
      }

      this.logger.info("OAuth2 account linked", {
        provider: "google",
        userId: linked.id,
      });

      return this.buildAuthResponse(linked.id, linked.email, linked);
    }

    const created = await this.userRepository.create({
      id: randomUUID(),
      email: identity.email,
      firstName: identity.firstName || "Google",
      lastName: identity.lastName || "User",
      authProvider: AuthProvider.GOOGLE,
      googleId: identity.googleId,
    });

    this.logger.info("OAuth2 user created", {
      provider: "google",
      userId: created.id,
    });

    return this.buildAuthResponse(created.id, created.email, created);
  }

  private buildAuthResponse(
    userId: string,
    email: string,
    user: User
  ): AuthResponseDto {
    const accessToken = this.tokenService.signAccessToken({ sub: userId, email });

    return {
      accessToken,
      user: toUserResponseDto(user),
    };
  }
}
