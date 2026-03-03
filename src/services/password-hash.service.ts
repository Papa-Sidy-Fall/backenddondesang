import bcrypt from "bcrypt";

export class PasswordHashService {
  async hash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, 10);
  }

  async compare(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
