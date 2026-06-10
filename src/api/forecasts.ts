import { AxiosInstance } from 'axios';

export async function getMyBeachForecasts(client: AxiosInstance) {
  const { data } = await client.get('/forecasts/my-beach');
  return data;
}
