import { ClerkProvider } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Slot } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { tokenCache } from '@/lib/tokenCache';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file');
}

const paperSettings = {
  icon: (props: any) => <MaterialCommunityIcons {...props} />,
};

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <PaperProvider settings={paperSettings}>
          <Slot />
        </PaperProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
