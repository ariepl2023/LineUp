import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { useApiClient } from '../api/client';
import { getPlans, subscribeToPlan } from '../api/plans';

type Plan = {
  id: number;
  name: string;
  price: number;
  description: string;
  has_alerts: boolean;
  max_beaches: number;
};

export default function PlansScreen() {
  const api = useApiClient();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<number | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      getPlans(api),
      api.get('/auth/me'),
    ])
      .then(([planList, meRes]) => {
        setPlans(planList);
        setCurrentPlanId(meRes.data.plan_id);
      })
      .catch(console.error);
  }, []);

  const handleSubscribe = async (plan: Plan) => {
    setLoadingPlanId(plan.id);
    try {
      await subscribeToPlan(api, plan.id);
      setCurrentPlanId(plan.id);
      Alert.alert('עודכן', `אתה כעת בתוכנית ${plan.name}.`);
    } catch {
      Alert.alert('שגיאה', 'עדכון התוכנית נכשל.');
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>בחר תוכנית</Text>

      {plans.map((plan) => {
        const isCurrent = currentPlanId === plan.id;
        return (
          <Card key={plan.id} style={[styles.card, isCurrent && styles.activeCard]}>
            <Card.Content>
              {isCurrent && (
                <Text style={styles.currentBadge}>תוכנית נוכחית</Text>
              )}
              <Text variant="titleLarge" style={styles.planName}>{plan.name}</Text>
              <Text variant="displaySmall" style={styles.price}>
                {plan.price === 0 ? 'חינם' : `$${plan.price}/חודש`}
              </Text>
              <Text variant="bodyMedium" style={styles.description}>{plan.description}</Text>
              {plan.has_alerts && <Text style={styles.feature}>✓ התראות טלגרם</Text>}
              {plan.has_alerts && <Text style={styles.feature}>✓ סף גלים ורוח מותאם אישית</Text>}
              <Text style={styles.feature}>✓ כל {plan.max_beaches} החופים</Text>
            </Card.Content>
            <Card.Actions>
              {isCurrent ? (
                <Button disabled>תוכנית נוכחית</Button>
              ) : (
                <Button
                  mode="contained"
                  loading={loadingPlanId === plan.id}
                  onPress={() => handleSubscribe(plan)}
                >
                  {plan.price === 0 ? 'עבור לחינמי' : 'שדרג לפרו'}
                </Button>
              )}
            </Card.Actions>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  content: { padding: 16, paddingBottom: 48 },
  title: { fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  card: { marginBottom: 16 },
  activeCard: { borderWidth: 2, borderColor: '#0066cc' },
  currentBadge: { color: '#0066cc', fontWeight: 'bold', fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  planName: { fontWeight: 'bold' },
  price: { color: '#0066cc', fontWeight: 'bold', marginVertical: 8 },
  description: { color: '#555', marginBottom: 12 },
  feature: { color: '#2d7a2d', marginTop: 4, fontSize: 14 },
});
