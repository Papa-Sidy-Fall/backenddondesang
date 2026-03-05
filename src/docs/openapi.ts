import { env } from "../config/environment.js";

const productionUrl = "https://backenddondesang.onrender.com";

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "DonDeSang API",
    version: "1.0.0",
    description:
      "API REST pour donneurs, hôpitaux, CNTS (administration), rendez-vous, stocks, campagnes, messagerie et logs.",
  },
  servers: [
    { url: `http://localhost:${env.port}`, description: "Local" },
    { url: productionUrl, description: "Production Render" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths: {
    "/": {
      get: { summary: "Root", responses: { "200": { description: "OK" } } },
    },
    "/test-db": {
      get: { summary: "Database test", responses: { "200": { description: "DB OK" } } },
    },
    "/api/v1/health": {
      get: { summary: "Health", responses: { "200": { description: "OK" } } },
    },
    "/api/v1/health/db": {
      get: { summary: "Health DB", responses: { "200": { description: "DB OK" } } },
    },
    "/api/v1/auth/register": {
      post: { summary: "Register donor", responses: { "201": { description: "Created" } } },
    },
    "/api/v1/auth/login": {
      post: { summary: "Login", responses: { "200": { description: "Authenticated" } } },
    },
    "/api/v1/auth/change-password": {
      post: {
        summary: "Change password",
        security: [{ bearerAuth: [] }],
        responses: { "204": { description: "Updated" } },
      },
    },
    "/api/v1/auth/google/url": {
      get: { summary: "Get Google OAuth URL", responses: { "200": { description: "OK" } } },
    },
    "/api/v1/auth/google/callback": {
      get: { summary: "Google OAuth callback", responses: { "302": { description: "Redirect" } } },
    },
    "/api/v1/dev-auth/login": {
      post: { summary: "Developer logs login", responses: { "200": { description: "Token" } } },
    },
    "/api/v1/users/me": {
      get: {
        summary: "Current user",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "User" } },
      },
    },
    "/api/v1/centers": {
      get: {
        summary: "List donation centers",
        parameters: [
          { name: "city", in: "query", schema: { type: "string" } },
          { name: "bloodType", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Centers" } },
      },
    },
    "/api/v1/appointments": {
      post: {
        summary: "Create appointment (donor)",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/v1/dashboards/donor": {
      get: {
        summary: "Donor dashboard",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Dashboard" } },
      },
    },
    "/api/v1/dashboards/hospital": {
      get: {
        summary: "Hospital dashboard",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Dashboard" } },
      },
    },
    "/api/v1/dashboards/admin": {
      get: {
        summary: "Admin dashboard",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Dashboard" } },
      },
    },
    "/api/v1/hospital/appointments/{id}/status": {
      patch: {
        summary: "Update appointment status",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Updated" } },
      },
    },
    "/api/v1/hospital/emergencies": {
      post: {
        summary: "Create emergency alert",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/v1/admin/campaigns": {
      post: {
        summary: "Create campaign",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/v1/admin/campaigns/{id}": {
      delete: {
        summary: "Delete campaign",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Deleted" } },
      },
    },
    "/api/v1/messages/contacts": {
      get: {
        summary: "Messaging contacts",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Contacts" } },
      },
    },
    "/api/v1/messages/conversations": {
      get: {
        summary: "List conversations",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Conversations" } },
      },
      post: {
        summary: "Create conversation",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/v1/messages/conversations/{id}/messages": {
      get: {
        summary: "List messages",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Messages" } },
      },
      post: {
        summary: "Send message",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/v1/stocks/me": {
      get: {
        summary: "Get my stocks (hospital/CNTS)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Stocks" } },
      },
    },
    "/api/v1/stocks/manual": {
      post: {
        summary: "Manual stock update (SET/ADD)",
        security: [{ bearerAuth: [] }],
        responses: { "204": { description: "Updated" } },
      },
    },
    "/api/v1/logs": {
      get: {
        summary: "Get app logs",
        responses: { "200": { description: "Logs" } },
      },
    },
  },
} as const;
