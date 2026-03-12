import type { Request, Response } from "express";
import { AppError } from "../shared/errors/app-error.js";
import { changePasswordSchema } from "../dtos/auth/change-password.dto.js";
import {
  googleAuthUrlQuerySchema,
  googleCallbackQuerySchema,
} from "../dtos/auth/google-oauth.dto.js";
import { loginDonorSchema } from "../dtos/auth/login-donor.dto.js";
import { registerDonorSchema } from "../dtos/auth/register-donor.dto.js";
import { AuthService } from "../services/auth.service.js";
import { GoogleOAuthService } from "../services/google-oauth.service.js";

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleOAuthService: GoogleOAuthService
  ) {}

  registerDonor = async (req: Request, res: Response): Promise<void> => {
    const dto = registerDonorSchema.parse(req.body);
    const authResponse = await this.authService.registerDonor(dto);
    res.status(201).json(authResponse);
  };

  loginDonor = async (req: Request, res: Response): Promise<void> => {
    const dto = loginDonorSchema.parse(req.body);
    const authResponse = await this.authService.loginDonor(dto);
    res.json(authResponse);
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    if (!req.authUser) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const dto = changePasswordSchema.parse(req.body);
    await this.authService.changePassword(req.authUser.userId, dto);
    res.status(204).send();
  };

  getGoogleAuthorizationUrl = (req: Request, res: Response): void => {
    const query = googleAuthUrlQuerySchema.parse(req.query);
    const url = this.googleOAuthService.getAuthorizationUrl(query.redirectUri);
    res.json({ url });
  };

  handleGoogleCallback = async (req: Request, res: Response): Promise<void> => {
    const query = googleCallbackQuerySchema.parse(req.query);
    const callbackResult = await this.googleOAuthService.handleCallback(query.code, query.state);

    const redirect = new URL(callbackResult.redirectUri);
    redirect.searchParams.set("oauth", "success");
    redirect.searchParams.set("token", callbackResult.auth.accessToken);

    res.redirect(redirect.toString());
  };
}
