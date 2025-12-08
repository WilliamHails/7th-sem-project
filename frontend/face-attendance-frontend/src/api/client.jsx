// src/api/client.js
import axios from "axios";

export const api = axios.create({
  baseURL: "http://127.0.0.1:8000", // FastAPI backend
});

// Helper: handle errors in UI-friendly way
export function getErrorMessage(error) {
  if (error.response?.data?.detail) return error.response.data.detail;
  if (error.response?.data?.message) return error.response.data.message;
  return error.message || "Unknown error";
}
