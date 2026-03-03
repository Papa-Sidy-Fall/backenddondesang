import { OAuth2Client } from "google-auth-library";
import { env } from "../config/environment.js";
import type { AuthResponseDto } from "../dtos/auth/auth-response.dto.js";
import { AppError } from "../shared/errors/app-error.js";
import { AppLogger } from "../shared/logging/app-logger.js";
import { AuthService } from "./auth.service.js";

interface OAuth2CallbackResult {
  auth: AuthResponseDto;
  redirectUri: string;
}

interface OAuth2StatePayload {
  redirectUri: string;
}

export class GoogleOAuthService {
  private readonly client: OAuth2Client | null;

  constructor(
    private readonly authService: AuthService,
    private readonly logger: AppLogger
  ) {
    this.client =
      env.googleClientId && env.googleClientSecret && env.googleCallbackUrl
        ? new OAuth2Client({
            clientId: env.googleClientId,
            clientSecret: env.googleClientSecret,
            redirectUri: env.googleCallbackUrl,
          })
        : null;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  getAuthorizationUrl(redirectUri?: string): string {
    const client = this.getConfiguredClient();
    const safeRedirect = this.validateRedirectUri(
      redirectUri ?? `${env.frontendUrls[0]}/connexion-donneur`
    );

    const statePayload: OAuth2StatePayload = { redirectUri: safeRedirect };
    const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

    return client.generateAuthUrl({
      access_type: "offline",
      scope: ["openid", "email", "profile"],
      prompt: "consent",
      state,
    });
  }

  async handleCallback(code: string, state?: string): Promise<OAuth2CallbackResult> {
    const client = this.getConfiguredClient();

    const { tokens } = await client.getToken(code);

    if (!tokens.id_token) {
      throw new AppError("Missing Google ID token", 400, "MISSING_GOOGLE_ID_TOKEN");
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.googleClientId,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      throw new AppError("Google account data is incomplete", 400, "GOOGLE_DATA_INCOMPLETE");
    }

    const auth = await this.authService.loginWithGoogle({
      email: payload.email,
      firstName: payload.given_name ?? "Google",
      lastName: payload.family_name ?? "User",
      googleId: payload.sub,
    });

    const redirectUri = this.extractRedirectUriFromState(state);

    this.logger.info("OAuth2 callback success", {
      provider: "google",
      email: payload.email,
      redirectUri,
    });

    return { auth, redirectUri };
  }

  private getConfiguredClient(): OAuth2Client {
    if (!this.client) {
      throw new AppError(
        "Google OAuth2 is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL",
        503,
        "OAUTH_NOT_CONFIGURED"
      );
    }

    return this.client;
  }

  private extractRedirectUriFromState(state?: string): string {
    if (!state) {
      return `${env.frontendUrls[0]}/connexion-donneur`;
    }

    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString()) as OAuth2StatePayload;
      return this.validateRedirectUri(decoded.redirectUri);
    } catch {
      return `${env.frontendUrls[0]}/connexion-donneur`;
    }
  }

  private validateRedirectUri(redirectUri: string): string {
    const parsed = new URL(redirectUri);
    const isAllowed = env.frontendUrls.some((allowedUrl) => {
      const allowedOrigin = new URL(allowedUrl).origin;
      return parsed.origin === allowedOrigin;
    });

    if (!isAllowed) {
      throw new AppError("Redirect URI is not allowed", 400, "INVALID_REDIRECT_URI");
    }

    return parsed.toString();
  }
}
