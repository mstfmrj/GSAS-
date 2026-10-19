






import { NextRequest } from "next/server";
import {
  getUser,
  addUser,
  getUsers,
  updateUser,
  toggleBlockUser,
  deleteUser,
  updateProfile,
} from "@/apiService/server/users";
import { createAuthenticatedActionHandler } from "@/lib/server/api-handler";
import { getAuthUser } from "@/helpers/server/getAuthUser";
import { authGuard } from "@/helpers/server/authGuard";
import { errorResponse, successResponse } from "@/lib/server/api-response";

export const POST = createAuthenticatedActionHandler({
  actions: {
    getUser,
    getUsers,
    addUser,
    updateUser,
    toggleBlockUser,
    deleteUser,
    updateProfile,
  },
  access: {
    getUser:         { permission: "users.view" },
    getUsers:        { permission: "users.view" },
    addUser:         { permission: "users.create" },
    updateUser:      { permission: "users.edit" },
    toggleBlockUser: { permission: "users.edit" },
    deleteUser:      { permission: "users.delete" },
  },
  requireUserFields: true,
});

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return errorResponse("Authentication required", 401);
  }

  if (!(await authGuard(user, { permission: "users.view" }))) {
    return errorResponse("Access denied: insufficient permissions", 403);
  }

  try {
    const data = await getUsers();
    return successResponse(data);
  } catch (error) {
    console.error("Get users API error:", error);
    return errorResponse("Internal server error", 500);
  }
}
