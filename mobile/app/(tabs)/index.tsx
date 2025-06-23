import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const [username, setUsername] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  
  useEffect(() => {
    loadUserInfo();
    loadMessageCount();
  }, []);
  
  const loadUserInfo = async () => {
    try {
      const userInfo = await AsyncStorage.getItem('user_info');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        setUsername(user.username);
      }
    } catch (error) {
      console.error('Kullanıcı bilgisi yükleme hatası:', error);
    }
  };
  
  const loadMessageCount = async () => {
    try {
      const savedMessages = await AsyncStorage.getItem('chatMessages');
      if (savedMessages) {
        const messages = JSON.parse(savedMessages);
        setMessageCount(messages.length);
      }
    } catch (error) {
      console.error('Mesaj sayısı yükleme hatası:', error);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('@/assets/images/icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <ThemedText style={styles.title}>AIVA Asistan</ThemedText>
      </View>
      
      <ThemedView style={styles.welcomeCard}>
        <ThemedText style={styles.welcomeTitle}>
          Merhaba, {username || 'Kullanıcı'}!
        </ThemedText>
        <ThemedText style={styles.welcomeText}>
          Yapay zeka asistanınız AIVA ile neler yapmak istersiniz?
        </ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.statsCard}>
        <View style={styles.statItem}>
          <Ionicons name="chatbubble-outline" size={24} color="#4299e1" />
          <ThemedText style={styles.statValue}>{messageCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Mesaj</ThemedText>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={24} color="#4299e1" />
          <ThemedText style={styles.statValue}>
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long' })}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Bugün</ThemedText>
        </View>
      </ThemedView>
      
      <ThemedText style={styles.sectionTitle}>Hızlı Erişim</ThemedText>
      
      <View style={styles.quickAccessGrid}>
        <TouchableOpacity 
          style={styles.quickAccessItem}
          onPress={() => router.push('/chat')}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#4299e1' }]}>
            <Ionicons name="chatbubble" size={24} color="#fff" />
          </View>
          <ThemedText style={styles.quickAccessLabel}>Sohbet</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickAccessItem}
          onPress={() => router.push('/profile')}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#48bb78' }]}>
            <Ionicons name="person" size={24} color="#fff" />
          </View>
          <ThemedText style={styles.quickAccessLabel}>Profil</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickAccessItem}>
          <View style={[styles.iconContainer, { backgroundColor: '#ed8936' }]}>
            <Ionicons name="settings" size={24} color="#fff" />
          </View>
          <ThemedText style={styles.quickAccessLabel}>Ayarlar</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickAccessItem}>
          <View style={[styles.iconContainer, { backgroundColor: '#9f7aea' }]}>
            <Ionicons name="help-circle" size={24} color="#fff" />
          </View>
          <ThemedText style={styles.quickAccessLabel}>Yardım</ThemedText>
        </TouchableOpacity>
      </View>
      
      <ThemedText style={styles.sectionTitle}>Özellikler</ThemedText>
      
      <ThemedView style={styles.featureCard}>
        <View style={styles.featureIconContainer}>
          <Ionicons name="mic" size={24} color="#4299e1" />
        </View>
        <View style={styles.featureContent}>
          <ThemedText style={styles.featureTitle}>Sesli Yanıtlar</ThemedText>
          <ThemedText style={styles.featureDescription}>
            AIVA&apos;nın yanıtlarını sesli olarak dinleyebilirsiniz.
          </ThemedText>
        </View>
      </ThemedView>
      
      <ThemedView style={styles.featureCard}>
        <View style={styles.featureIconContainer}>
          <Ionicons name="person" size={24} color="#4299e1" />
        </View>
        <View style={styles.featureContent}>
          <ThemedText style={styles.featureTitle}>Kişiselleştirilmiş Deneyim</ThemedText>
          <ThemedText style={styles.featureDescription}>
            AIVA sizi tanır ve tercihlerinize göre yanıtlar verir.
          </ThemedText>
        </View>
      </ThemedView>
      
      <ThemedView style={styles.featureCard}>
        <View style={styles.featureIconContainer}>
          <Ionicons name="cloud" size={24} color="#4299e1" />
        </View>
        <View style={styles.featureContent}>
          <ThemedText style={styles.featureTitle}>Sürekli Gelişen Yapay Zeka</ThemedText>
          <ThemedText style={styles.featureDescription}>
            AIVA her gün daha akıllı hale geliyor ve yeni yetenekler kazanıyor.
          </ThemedText>
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  welcomeCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
  },
  statsCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#4a5568',
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  quickAccessItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickAccessLabel: {
    fontSize: 14,
  },
  featureCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(66, 153, 225, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
});

