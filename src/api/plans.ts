import { AxiosInstance } from 'axios';

export async function getPlans(client: AxiosInstance) {
  const { data } = await client.get('/plans');
  return data;
}

export async function subscribeToPlan(client: AxiosInstance, planId: number) {
  const { data } = await client.post(`/plans/subscribe/${planId}`);
  return data;
}
