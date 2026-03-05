import { randomUUID } from "node:crypto";
import { env } from "../config/environment.js";
import { AuthProvider } from "../domain/enums/auth-provider.enum.js";
import { UserRole } from "../domain/enums/user-role.enum.js";
import type { IUserRepository } from "../repositories/interfaces/user-repository.interface.js";
import { AppLogger } from "../shared/logging/app-logger.js";
import { PasswordHashService } from "./password-hash.service.js";

export class AccountSeedService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHashService: PasswordHashService,
    private readonly logger: AppLogger
  ) {}

  async ensureDefaultAccounts(): Promise<void> {
    await this.ensureAccount({
      email: env.defaultAccounts.admin.email,
      password: env.defaultAccounts.admin.password,
      firstName: "Super",
      lastName: "Admin",
      role: UserRole.ADMIN,
      hospitalName: null,
      city: "Dakar",
    });

    await this.ensureAccount({
      email: env.defaultAccounts.dantec.email,
      password: env.defaultAccounts.dantec.password,
      firstName: "Hopital",
      lastName: "Le Dantec",
      role: UserRole.HOSPITAL,
      hospitalName: "Hôpital Le Dantec",
      city: "Dakar",
    });

    await this.ensureAccount({
      email: env.defaultAccounts.fann.email,
      password: env.defaultAccounts.fann.password,
      firstName: "Hopital",
      lastName: "Fann",
      role: UserRole.HOSPITAL,
      hospitalName: "Hôpital Fann",
      city: "Dakar",
    });
  }

  private async ensureAccount(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    hospitalName: string | null;
    city: string | null;
  }): Promise<void> {
    const existing = await this.userRepository.findByEmail(input.email);

    if (existing) {
      return;
    }

    const passwordHash = await this.passwordHashService.hash(input.password);

    await this.userRepository.create({
      id: randomUUID(),
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      hospitalName: input.hospitalName,
      city: input.city,
      passwordHash,
      authProvider: AuthProvider.LOCAL,
    });

    this.logger.info("Default account created", {
      email: input.email,
      role: input.role,
      hospitalName: input.hospitalName,
      city: input.city,
    });
  }
}
