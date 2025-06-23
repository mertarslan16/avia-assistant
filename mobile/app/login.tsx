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
  Image,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { authService } from '@/utils/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Giriş işlemi
  const handleLogin = async () => {
    // Form doğrulama
    if (!email.trim()) {
      Alert.alert('Hata', 'Lütfen e-posta adresinizi girin.');
      return;
    }
    
    if (!password.trim()) {
      Alert.alert('Hata', 'Lütfen şifrenizi girin.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Backend'e giriş isteği gönder
      const response = await authService.login(email, password);
      
      // Token ve kullanıcı bilgilerini kaydet
      await AsyncStorage.setItem('auth_token', response.token);
      await AsyncStorage.setItem('user_info', JSON.stringify(response.user));
      
      // Ana sayfaya yönlendir
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Giriş hatası:', error);
      
      // Hata mesajını göster
      if (error.response && error.response.data && error.response.data.message) {
        Alert.alert('Giriş Başarısız', error.response.data.message);
      } else {
        Alert.alert('Giriş Başarısız', 'Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Demo giriş (backend bağlantısı olmadan test için)
  const handleDemoLogin = async () => {
    setIsLoading(true);
    
    try {
      // Demo kullanıcı bilgilerini kaydet
      await AsyncStorage.setItem('auth_token', 'demo_token');
      await AsyncStorage.setItem('user_info', JSON.stringify({
        id: 'demo_id',
        username: 'Demo Kullanıcı',
        email: 'demo@example.com'
      }));
      
      // Ana sayfaya yönlendir
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Demo giriş hatası:', error);
      Alert.alert('Hata', 'Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
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
          <ThemedText style={styles.appName}>AIVA Asistan</ThemedText>
        </View>
        
        <ThemedView style={styles.formContainer}>
          <ThemedText style={styles.title}>Giriş Yap</ThemedText>
          
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
          
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <ThemedText style={styles.loginButtonText}>Giriş Yap</ThemedText>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.demoButton}
            onPress={handleDemoLogin}
            disabled={isLoading}
          >
            <ThemedText style={styles.demoButtonText}>Demo Giriş</ThemedText>
          </TouchableOpacity>
          
          <View style={styles.registerContainer}>
            <ThemedText style={styles.registerText}>
              Hesabınız yok mu?
            </ThemedText>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <ThemedText style={styles.registerLink}>Kayıt Ol</ThemedText>
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
    justifyContent: 'center',
    padding: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
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
  loginButton: {
    backgroundColor: '#4299e1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  demoButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4299e1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  demoButtonText: {
    color: '#4299e1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    marginRight: 8,
  },
  registerLink: {
    color: '#4299e1',
    fontWeight: 'bold',
  },
});
