import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Button, TextInput, Menu, Divider } from 'react-native-paper';
import { useClerk } from '@clerk/expo';
import { useApiClient } from '../api/client';
import { getBeaches } from '../api/beaches';
import { getPreferences, savePreferences } from '../api/preferences';

type Beach = { id: number; name: string };

export default function SettingsScreen({ navigation }: any) {
  const api = useApiClient();
  const { signOut } = useClerk();

  const [beaches, setBeaches] = useState<Beach[]>([]);
  const [selectedBeach, setSelectedBeach] = useState<Beach | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const [minWave, setMinWave] = useState('');
  const [minWind, setMinWind] = useState('');
  const [maxWind, setMaxWind] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getBeaches(api), getPreferences(api)])
      .then(([beachList, prefs]) => {
        setBeaches(beachList);
        if (prefs?.beach_id) {
          const found = beachList.find((b: Beach) => b.id === prefs.beach_id);
          if (found) setSelectedBeach(found);
        }
        if (prefs?.min_wave_height) setMinWave(String(prefs.min_wave_height));
        if (prefs?.min_wind_speed) setMinWind(String(prefs.min_wind_speed));
        if (prefs?.max_wind_speed) setMaxWind(String(prefs.max_wind_speed));
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    if (!selectedBeach) {
      Alert.alert('בחר חוף', 'יש לבחור חוף לפני השמירה.');
      return;
    }
    setSaving(true);
    try {
      await savePreferences(api, {
        beach_id: selectedBeach.id,
        min_wave_height: minWave ? parseFloat(minWave) : undefined,
        min_wind_speed: minWind ? parseFloat(minWind) : undefined,
        max_wind_speed: maxWind ? parseFloat(maxWind) : undefined,
      });
      Alert.alert('נשמר', 'ההגדרות שלך נשמרו.');
    } catch {
      Alert.alert('שגיאה', 'שמירת ההגדרות נכשלה.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Beach picker */}
      <Text variant="titleMedium" style={styles.sectionTitle}>חוף</Text>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Button mode="outlined" onPress={() => setMenuVisible(true)} style={styles.picker}>
            {selectedBeach ? selectedBeach.name : 'בחר חוף...'}
          </Button>
        }
      >
        {beaches.map((beach) => (
          <Menu.Item
            key={beach.id}
            title={beach.name}
            onPress={() => { setSelectedBeach(beach); setMenuVisible(false); }}
          />
        ))}
      </Menu>

      <Divider style={styles.divider} />

      {/* Alert thresholds */}
      <Text variant="titleMedium" style={styles.sectionTitle}>סף התראות</Text>
      <Text variant="bodySmall" style={styles.hint}>
        תקבל התראת טלגרם כאשר כל התנאים מתקיימים בו-זמנית.
      </Text>
      <TextInput
        label="גובה גל מינימלי (מ׳)"
        value={minWave}
        onChangeText={setMinWave}
        keyboardType="decimal-pad"
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label='מהירות רוח מינימלית (קמ"ש)'
        value={minWind}
        onChangeText={setMinWind}
        keyboardType="decimal-pad"
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label='מהירות רוח מקסימלית (קמ"ש)'
        value={maxWind}
        onChangeText={setMaxWind}
        keyboardType="decimal-pad"
        mode="outlined"
        style={styles.input}
      />

      <Button mode="contained" onPress={handleSave} loading={saving} style={styles.saveBtn}>
        שמור הגדרות
      </Button>

      <Divider style={styles.divider} />

      {/* Telegram */}
      <Button
        mode="outlined"
        icon="send"
        onPress={() => navigation.navigate('ConnectTelegram')}
        style={styles.telegramBtn}
      >
        חבר טלגרם
      </Button>

      {/* Sign out */}
      <Button
        mode="outlined"
        onPress={() => signOut()}
        style={styles.signOutBtn}
        textColor="red"
      >
        התנתק
      </Button>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  content: { padding: 16, paddingBottom: 48 },
  sectionTitle: { fontWeight: 'bold', marginBottom: 8, marginTop: 8 },
  hint: { color: '#666', marginBottom: 12, lineHeight: 18 },
  picker: { marginBottom: 8 },
  input: { marginBottom: 12 },
  divider: { marginVertical: 20 },
  saveBtn: { marginTop: 8 },
  telegramBtn: { marginBottom: 12 },
  signOutBtn: { borderColor: 'red' },
});
