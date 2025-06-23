import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { logout } from '@/utils/api';

interface UserInfo {
  id: string;
  username: string;
  email: string;
}

export default function ProfileScreen() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadUserInfo();
  }, []);
  
  const loadUserInfo = async () => {
    try {
      const userInfoStr = await AsyncStorage.getItem('user_info');
      if (userInfoStr) {
        setUserInfo(JSON.parse(userInfoStr));
      }
    } catch (error) {
      console.error('Kullanıcı bilgisi yükleme hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              console.error('Çıkış hatası:', error);
              Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };
  
  const clearChatHistory = async () => {
    Alert.alert(
      'Sohbet Geçmişini Temizle',
      'Tüm sohbet geçmişiniz silinecek. Bu işlem geri alınamaz.',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.setItem('chatMessages', JSON.stringify([]));
              Alert.alert('Başarılı', 'Sohbet geçmişi temizlendi.');
            } catch (error) {
              console.error('Sohbet temizleme hatası:', error);
              Alert.alert('Hata', 'Sohbet geçmişi temizlenirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4299e1" />
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <ThemedText style={styles.avatarText}>
            {userInfo?.username?.charAt(0).toUpperCase() || 'A'}
          </ThemedText>
        </View>
        <ThemedText style={styles.username}>{userInfo?.username || 'Kullanıcı'}</ThemedText>
        <ThemedText style={styles.email}>{userInfo?.email || 'kullanici@ornek.com'}</ThemedText>
      </ThemedView>
      
      <ThemedText style={styles.sectionTitle}>Hesap</ThemedText>
      
      <ThemedView style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="person-outline" size={24} color="#4299e1" />
          <ThemedText style={styles.menuItemText}>Profil Bilgileri</ThemedText>
          <Ionicons name="chevron-forward" size={20} color="#a0aec0" />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="lock-closed-outline" size={24} color="#4299e1" />
          <ThemedText style={styles.menuItemText}>Şifre Değiştir</ThemedText>
          <Ionicons name="chevron-forward" size={20} color="#a0aec0" />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={24} color="#4299e1" />
          <ThemedText style={styles.menuItemText}>Bildirim Ayarları</ThemedText>
          <Ionicons name="chevron-forward" size={20} color="#a0aec0" />
        </TouchableOpacity>
      </ThemedView>
      
      <ThemedText style={styles.sectionTitle}>Uygulama</ThemedText>
      
      <ThemedView style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="color-palette-outline" size={24} color="#4299e1" />
          <ThemedText style={styles.menuItemText}>Tema</ThemedText>
          <Ionicons name="chevron-forward" size={20} color="#a0aec0" />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="language-outline" size={24} color="#4299e1" />
          <ThemedText style={styles.menuItemText}>Dil</ThemedText>
          <Ionicons name="chevron-forward" size={20} color="#a0aec0" />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={clearChatHistory}
        >
          <Ionicons name="trash-outline" size={24} color="#4299e1" />
          <ThemedText style={styles.menuItemText}>Sohbet Geçmişini Temizle</ThemedText>
          <Ionicons name="chevron-forward" size={20} color="#a0aec0" />
        </TouchableOpacity>
      </ThemedView>
      
      <ThemedText style={styles.sectionTitle}>Hakkında</ThemedText>
      
      <ThemedView style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="information-circle-outline" size={24} color="#4299e1" />
          <ThemedText style={styles.menuItemText}>Uygulama Hakkında</ThemedText>
          <Ionicons name="chevron-forward" size={20} color="#a0aec0" />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#4299e1" />
          <ThemedText style={styles.menuItemText}>Gizlilik Politikası</ThemedText>
          <Ionicons name="chevron-forward" size={20} color="#a0aec0" />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="document-text-outline" size={24} color="#4299e1" />
          <ThemedText style={styles.menuItemText}>Kullanım Koşulları</ThemedText>
          <Ionicons name="chevron-forward" size={20} color="#a0aec0" />
        </TouchableOpacity>
      </ThemedView>
      
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={24} color="#fff" />
        <ThemedText style={styles.logoutButtonText}>Çıkış Yap</ThemedText>
      </TouchableOpacity>
      
      <ThemedText style={styles.versionText}>Versiyon 1.0.0</ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4299e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    opacity: 0.7,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  menuContainer: {
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#4a5568',
    marginLeft: 56,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#e53e3e',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.5,
    marginBottom: 24,
  },
});