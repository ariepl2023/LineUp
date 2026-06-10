import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AuthView } from '@clerk/expo/native';

export default function AuthScreen() {
  return (
    <View style={styles.container}>
      <AuthView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
