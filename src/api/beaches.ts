import { AxiosInstance } from 'axios';

export async function getBeaches(client: AxiosInstance) {
  const { data } = await client.get('/beaches');
  return data;
}
