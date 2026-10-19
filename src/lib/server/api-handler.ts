






import { NextRequest } from "next/server";
import { getAuthUser } from "@/helpers/server/getAuthUser";
import { authGuard, AuthorizationError, PermissionRule } from "@/helpers/server/authGuard";
import { successResponse, errorResponse } from "./api-response";
import { SessionPayload } from "@/lib/types";

export interface ActionHandlerConfig {
  actions: Record<string, (data: any, user: SessionPayload) => Promise<any> | any>;
  access?: Record<string, PermissionRule>;
  requireUserFields?: boolean;
}

export function createAuthenticatedActionHandler(config: ActionHandlerConfig) {
  return async function POST(req: NextRequest) {
    try {
      const user = await getAuthUser(req);
      if (!user) {
        return errorResponse("Authentication required", 401);
      }

      const body = await req.json().catch(() => ({}));
      const { action, ...data } = body;

      if (!action || typeof action !== "string") {
        return errorResponse("Action parameter is required", 400);
      }

      const handler = config.actions[action];
      if (!handler) {
        return errorResponse(`Action '${action}' not supported`, 400);
      }

      const accessRule = config.access?.[action];
      if (accessRule && !(await authGuard(user, accessRule))) {
        return errorResponse("Access denied: insufficient permissions", 403);
      }

      const result = await handler(data, user);
      return successResponse(result);
    } catch (err: any) {
      if (err instanceof AuthorizationError) {
        return errorResponse(err.message, 403);
      }
      return errorResponse(err.message || "Internal server error", 500);
    }
  };
}
