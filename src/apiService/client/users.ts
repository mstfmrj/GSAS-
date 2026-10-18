/**
 * src/apiService/client/users.ts
 *
 * PURPOSE:
 * This client-side service module provides frontend functions to interact with the
 * User Management API (`/api/users`).
 *
 * HOW IT WORKS:
 * Instead of separate endpoints for every user action, the backend uses a single
 * action-dispatcher endpoint (`/api/users`). Each function here sends a POST request
 * with an `action` string (e.g., "getUser", "addUser", "deleteUser") alongside the
 * payload data using the `callApi` helper.
 */

import { callApi } from "@/helpers/client/callApi";

// Base API endpoint for user operations
const API_URL = "/api/users";

/**
 * Fetch a single user's details and permissions by their ID.
 * @param data - Object containing { id: string }
 * @returns The user object with safe details and permissions, or null on error.
 */
export const getUser = async (data: Record<string, any> = {}) => {
  try {
    data.action = "getUser";
    const response = await callApi(API_URL, data, true, true);
    return response?.data;
  } catch {
    return null;
  }
};

/**
 * Fetch a list of all users along with online/offline presence summary.
 * @param data - Optional filtering or pagination parameters
 * @returns Array of users with summary counts, or empty array on error.
 */
export const getUsers = async (data: Record<string, any> = {}) => {
  try {
    data.action = "getUsers";
    const response = await callApi(API_URL, data, true, true);
    return response?.data;
  } catch {
    return [];
  }
};

/**
 * Create a new user account with specified username, email, password, and role.
 * @param data - User fields: { username, email, password, name, role, permissions }
 * @returns The created user object, or null on error.
 */
export const addUser = async (data: Record<string, any>) => {
  try {
    data.action = "addUser";
    const response = await callApi(API_URL, data, true, true);
    return response?.data;
  } catch {
    return null;
  }
};

/**
 * Update an existing user's profile details, assigned role, or custom permissions.
 * @param data - Updated fields containing { id, name, username, role, permissions }
 * @returns The updated user record.
 */
export const updateUser = async (data: Record<string, any>) => {
  const response = await callApi(API_URL, { ...data, action: "updateUser" }, true, true);
  return response?.data;
};

/**
 * Toggle the blocked/active status of a user account.
 * Blocked users cannot authenticate or access protected endpoints.
 * @param data - Object containing { id: string, blocked: boolean }
 * @returns The updated user object with status message, or null on error.
 */
export const toggleBlockUser = async (data: Record<string, any>) => {
  try {
    data.action = "toggleBlockUser";
    const response = await callApi(API_URL, data, true, true);
    return response?.data;
  } catch {
    return null;
  }
};

/**
 * Delete a user account permanently from the database.
 * @param data - Object containing { id: string }
 * @returns Result object with confirmation message, or null on error.
 */
export const deleteUser = async (data: Record<string, any>) => {
  try {
    data.action = "deleteUser";
    const response = await callApi(API_URL, data, true, true);
    return response?.data;
  } catch {
    return null;
  }
};

/**
 * Update the currently logged-in user's own profile (name, username, and/or password).
 * @param data - Object containing { name?: string; username?: string; currentPassword?: string; newPassword?: string }
 * @returns The updated user record.
 */
export const updateProfile = async (data: {
  name?: string;
  username?: string;
  currentPassword?: string;
  newPassword?: string;
}) => {
  const response = await callApi(API_URL, { ...data, action: "updateProfile" }, true, true);
  return response?.data;
};

