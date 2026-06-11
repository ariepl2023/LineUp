import { AuthView } from '@clerk/expo/native';
import { View, StyleSheet } from 'react-native';

export default function SignInScreen() {
  return (
    <View style={styles.container}>
      <AuthView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
