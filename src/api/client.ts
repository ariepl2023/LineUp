import axios from "axios";
import { useAuth } from "@clerk/expo";

export const API_BASE_URL = "http://10.0.0.139:3001";

export function useApiClient() {
  const { getToken } = useAuth();

  const client = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

  client.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return client;
}
