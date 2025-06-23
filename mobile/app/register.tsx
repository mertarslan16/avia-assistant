import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { authService } from '@/utils/api';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Kayıt işlemi
  const handleRegister = async () => {
    // Form doğrulama
    if (!username.trim()) {
      Alert.alert('Hata', 'Lütfen kullanıcı adınızı girin.');
      return;
    }
    
    if (!email.trim()) {
      Alert.alert('Hata', 'Lütfen e-posta adresinizi girin.');
      return;
    }
    
    if (!password.trim()) {
      Alert.alert('Hata', 'Lütfen şifrenizi girin.');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Backend'e kayıt isteği gönder
      const response = await authService.register(username, email, password);
      
      // Token ve kullanıcı bilgilerini kaydet
      await AsyncStorage.setItem('auth_token', response.token);
      await AsyncStorage.setItem('user_info', JSON.stringify(response.user));
      
      // Ana sayfaya yönlendir
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Kayıt hatası:', error);
      
      // Hata mesajını göster
      if (error.response && error.response.data && error.response.data.message) {
        Alert.alert('Kayıt Başarısız', error.response.data.message);
      } else {
        Alert.alert('Kayıt Başarısız', 'Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <Stack.Screen 
        options={{
          title: 'Kayıt Ol',
          headerStyle: {
            backgroundColor: '#1a202c',
          },
          headerTintColor: '#fff',
        }}
      />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.logoContainer}>
          <Image 
            source={require('@/assets/images/icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <ThemedView style={styles.formContainer}>
          <ThemedText style={styles.title}>Yeni Hesap Oluştur</ThemedText>
          
          <TextInput
            style={styles.input}
            placeholder="Kullanıcı Adı"
            placeholderTextColor="#a0aec0"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="E-posta"
            placeholderTextColor="#a0aec0"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Şifre"
            placeholderTextColor="#a0aec0"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TextInput
            style={styles.input}
            placeholder="Şifre Tekrar"
            placeholderTextColor="#a0aec0"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          
          <TouchableOpacity 
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <ThemedText style={styles.registerButtonText}>Kayıt Ol</ThemedText>
            )}
          </TouchableOpacity>
          
          <View style={styles.loginContainer}>
            <ThemedText style={styles.loginText}>
              Zaten hesabınız var mı?
            </ThemedText>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <ThemedText style={styles.loginLink}>Giriş Yap</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a202c',
  },
  keyboardAvoidingView: {
    flex: 1,
    padding: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 60,
    height: 60,
  },
  formContainer: {
    borderRadius: 12,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2d3748',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    color: '#fff',
    fontSize: 16,
  },
  registerButton: {
    backgroundColor: '#4299e1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    marginRight: 8,
  },
  loginLink: {
    color: '#4299e1',
    fontWeight: 'bold',
  },
});

