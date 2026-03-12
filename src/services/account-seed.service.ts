import { randomUUID } from "node:crypto";
import { CENTER_DIRECTORY } from "../config/center-directory.js";
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
    // Keep legacy defaults for backward compatibility with existing deployments.
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

    for (const center of CENTER_DIRECTORY) {
      const nameParts = center.hospitalName.replace(/^Hôpital\\s+/i, "").split(" ");
      const firstName = nameParts[0] || "Centre";
      const lastName = nameParts.slice(1).join(" ") || "Santé";

      await this.ensureAccount({
        email: center.email,
        password: center.password,
        firstName,
        lastName,
        role: UserRole.HOSPITAL,
        hospitalName: center.hospitalName,
        city: center.city,
      });
    }
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
