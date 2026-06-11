import { useAuth } from '@clerk/expo';
import { Redirect, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

const HEADER_STYLE = {
  headerStyle: { backgroundColor: '#00bcd4' },
  headerTintColor: 'white',
  headerShadowVisible: false,
} as const;

export default function HomeLayout() {
  const { isSignedIn, isLoaded } = useAuth({ treatPendingAsSignedOut: false });

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack screenOptions={HEADER_STYLE}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="connect-telegram" options={{ title: 'חיבור טלגרם' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
