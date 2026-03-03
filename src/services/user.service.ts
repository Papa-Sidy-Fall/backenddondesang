import type { UserResponseDto } from "../dtos/auth/user-response.dto.js";
import { toUserResponseDto } from "../dtos/auth/user-response.dto.js";
import type { IUserRepository } from "../repositories/interfaces/user-repository.interface.js";
import { AppError } from "../shared/errors/app-error.js";

export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async getById(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return toUserResponseDto(user);
  }
}
