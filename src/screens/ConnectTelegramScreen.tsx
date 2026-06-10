import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Linking, Alert } from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import { useApiClient } from '../api/client';

export default function ConnectTelegramScreen() {
  const api = useApiClient();
  const [chatId, setChatId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/auth/me')
      .then(({ data }) => {
        if (data.telegram_chat_id) {
          setChatId(String(data.telegram_chat_id));
          setIsConnected(true);
        }
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    if (!chatId.trim()) {
      Alert.alert('חסר', 'יש להזין את מזהה הטלגרם שלך.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/auth/update-telegram', { telegram_chat_id: chatId.trim() });
      setIsConnected(true);
      Alert.alert('מחובר!', 'חשבון הטלגרם שלך מחובר. תקבל התראות גלים יומיות.');
    } catch {
      Alert.alert('שגיאה', 'שמירת מזהה הטלגרם נכשלה. ודא שמדובר במספר תקין.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>חיבור טלגרם</Text>

      {isConnected && (
        <View style={styles.connectedBanner}>
          <Text style={styles.connectedText}>✓ טלגרם מחובר</Text>
        </View>
      )}

      <Text variant="titleSmall" style={styles.step}>שלב 1</Text>
      <Text style={styles.stepText}>פתח טלגרם והתחל שיחה עם בוט SwellBot</Text>
      <Button
        mode="outlined"
        icon="send"
        onPress={() => Linking.openURL('https://t.me/SwellBot')}
        style={styles.telegramBtn}
      >
        פתח @SwellBot
      </Button>

      <Text variant="titleSmall" style={styles.step}>שלב 2</Text>
      <Text style={styles.stepText}>שלח <Text style={styles.code}>/start</Text> לבוט — הוא ישיב עם מספר ה-Chat ID שלך</Text>

      <Text variant="titleSmall" style={styles.step}>שלב 3</Text>
      <Text style={styles.stepText}>הדבק את ה-Chat ID שלך למטה</Text>
      <TextInput
        label="מזהה טלגרם (Chat ID)"
        value={chatId}
        onChangeText={setChatId}
        keyboardType="number-pad"
        mode="outlined"
        style={styles.input}
      />

      <Button mode="contained" onPress={handleSave} loading={saving} style={styles.saveBtn}>
        שמור
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48 },
  title: { fontWeight: 'bold', marginBottom: 24 },
  connectedBanner: {
    backgroundColor: '#e6f4ea', borderRadius: 8,
    padding: 12, marginBottom: 24,
  },
  connectedText: { color: '#2d7a2d', fontWeight: '600', textAlign: 'center' },
  step: { fontWeight: 'bold', color: '#0066cc', marginTop: 20, marginBottom: 4 },
  stepText: { color: '#333', lineHeight: 22, marginBottom: 12 },
  code: { fontFamily: 'monospace', backgroundColor: '#f0f0f0', color: '#c0392b' },
  telegramBtn: { marginBottom: 8 },
  input: { marginTop: 8 },
  saveBtn: { marginTop: 24 },
});
