import { AxiosInstance } from 'axios';

export async function getPreferences(client: AxiosInstance) {
  const { data } = await client.get('/preferences');
  return data;
}

export async function savePreferences(client: AxiosInstance, prefs: {
  beach_id?: number;
  min_wave_height?: number;
  min_wind_speed?: number;
  max_wind_speed?: number;
  alert_time?: string;
}) {
  const { data } = await client.post('/preferences', prefs);
  return data;
}
