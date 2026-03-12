import { randomUUID } from "node:crypto";
import { AuthProvider } from "../domain/enums/auth-provider.enum.js";
import type { User } from "../domain/entities/user.entity.js";
import { UserRole } from "../domain/enums/user-role.enum.js";
import type { AuthResponseDto } from "../dtos/auth/auth-response.dto.js";
import type { ChangePasswordDto } from "../dtos/auth/change-password.dto.js";
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
      throw new AppError("Un compte existe déjà avec cette adresse email.", 409, "EMAIL_ALREADY_USED");
    }

    const existingByPhone = await this.userRepository.findDonorByPhone(dto.phone);
    if (existingByPhone) {
      throw new AppError(
        "Un compte donneur existe déjà avec ce numéro de téléphone.",
        409,
        "PHONE_ALREADY_USED"
      );
    }

    const existingByCni = await this.userRepository.findDonorByCni(dto.cni);
    if (existingByCni) {
      throw new AppError("Un compte donneur existe déjà avec ce CNI.", 409, "CNI_ALREADY_USED");
    }

    const passwordHash = await this.passwordHashService.hash(dto.password);

    let user: User;
    try {
      user = await this.userRepository.create({
        id: randomUUID(),
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        cni: dto.cni,
        phone: dto.phone,
        birthDate: dto.birthDate,
        bloodType: dto.bloodType,
        city: dto.city,
        district: dto.district,
        passwordHash,
        role: UserRole.DONOR,
        authProvider: AuthProvider.LOCAL,
      });
    } catch (error: unknown) {
      const pgError = error as { code?: string; constraint?: string };
      if (pgError.code === "23505") {
        if (pgError.constraint === "idx_users_donor_cni_unique") {
          throw new AppError("Un compte donneur existe déjà avec ce CNI.", 409, "CNI_ALREADY_USED");
        }

        if (pgError.constraint === "idx_users_donor_phone_unique") {
          throw new AppError(
            "Un compte donneur existe déjà avec ce numéro de téléphone.",
            409,
            "PHONE_ALREADY_USED"
          );
        }

        if (pgError.constraint === "users_email_key") {
          throw new AppError(
            "Un compte existe déjà avec cette adresse email.",
            409,
            "EMAIL_ALREADY_USED"
          );
        }
      }

      throw error;
    }

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

    this.logger.info("User logged in", { userId: user.id, email: user.email, role: user.role });

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
      role: UserRole.DONOR,
      authProvider: AuthProvider.GOOGLE,
      googleId: identity.googleId,
    });

    this.logger.info("OAuth2 user created", {
      provider: "google",
      userId: created.id,
    });

    return this.buildAuthResponse(created.id, created.email, created);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (!user.passwordHash) {
      throw new AppError(
        "Password change is not available for OAuth-only account",
        400,
        "PASSWORD_CHANGE_NOT_AVAILABLE"
      );
    }

    const isCurrentPasswordValid = await this.passwordHashService.compare(
      dto.currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new AppError("Current password is incorrect", 400, "INVALID_CURRENT_PASSWORD");
    }

    const newPasswordHash = await this.passwordHashService.hash(dto.newPassword);
    await this.userRepository.updatePassword(user.id, newPasswordHash);

    this.logger.info("Password updated", {
      userId: user.id,
      role: user.role,
    });
  }

  private buildAuthResponse(
    userId: string,
    email: string,
    user: User
  ): AuthResponseDto {
    const accessToken = this.tokenService.signAccessToken({
      sub: userId,
      email,
      role: user.role,
    });

    return {
      accessToken,
      user: toUserResponseDto(user),
    };
  }
}
