export {};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      authUser?: {
        userId: string;
        email: string;
        role?: string;
      };
    }
  }
}
