import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

export default function TabChatScreen() {
  useEffect(() => {
    // Bu sayfa açıldığında ana sohbet sayfasına yönlendir
    router.replace('/chat');
  }, []);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});