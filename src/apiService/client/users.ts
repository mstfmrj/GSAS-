
import { callApi } from "@/helpers/client/callApi";


const API_URL = "/api/users";


export const getUser = async (data: Record<string, any> = {}) => {
  try {
    data.action = "getUser";
    const response = await callApi(API_URL, data, true, true);
    return response?.data;
  } catch {
    return null;
  }
};


export const getUsers = async (data: Record<string, any> = {}) => {
  try {
    data.action = "getUsers";
    const response = await callApi(API_URL, data, true, true);
    return response?.data;
  } catch {
    return [];
  }
};


export const addUser = async (data: Record<string, any>) => {
  try {
    data.action = "addUser";
    const response = await callApi(API_URL, data, true, true);
    return response?.data;
  } catch {
    return null;
  }
};


export const updateUser = async (data: Record<string, any>) => {
  const response = await callApi(API_URL, { ...data, action: "updateUser" }, true, true);
  return response?.data;
};


export const toggleBlockUser = async (data: Record<string, any>) => {
  try {
    data.action = "toggleBlockUser";
    const response = await callApi(API_URL, data, true, true);
    return response?.data;
  } catch {
    return null;
  }
};


export const deleteUser = async (data: Record<string, any>) => {
  try {
    data.action = "deleteUser";
    const response = await callApi(API_URL, data, true, true);
    return response?.data;
  } catch {
    return null;
  }
};

export const deletePendingUser = async (data: Record<string, any>) => {
  const response = await callApi(API_URL, { ...data, action: "deletePendingUser" }, true, true);
  return response?.data;
};

export const approvePendingUser = async (data: Record<string, any>) => {
  const response = await callApi(API_URL, { ...data, action: "approvePendingUser" }, true, true);
  return response?.data;
};


export const updateProfile = async (data: {
  name?: string;
}) => {
  const response = await callApi(API_URL, { ...data, action: "updateProfile" }, true, true);
  return response?.data;
};

