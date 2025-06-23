import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AIVAComponent = () => {
  const [username, setUsername] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  
  useEffect(() => {
    // Kullanıcı adını yükle
    loadUsername();
    // Mesaj sayısını yükle
    loadMessageCount();
  }, []);
  
  const loadUsername = async () => {
    try {
      const savedUsername = await AsyncStorage.getItem('username');
      if (savedUsername) {
        setUsername(savedUsername);
      }
    } catch (error) {
      console.error('Kullanıcı adı yükleme hatası:', error);
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
  
  const handleStartChat = () => {
    router.push('/chat');
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.aiStatusContainer}>
        <View style={styles.statusIndicator} />
        <Text style={styles.statusText}>AIVA Aktif</Text>
      </View>
      
      <View style={styles.infoContainer}>
        {username ? (
          <Text style={styles.welcomeText}>
            Merhaba <Text style={styles.highlightText}>{username}</Text>, size nasıl yardımcı olabilirim?
          </Text>
        ) : (
          <Text style={styles.welcomeText}>
            Merhaba, size nasıl yardımcı olabilirim?
          </Text>
        )}
        
        <Text style={styles.messageCount}>
          {messageCount > 0 
            ? `${messageCount} mesaj gönderildi` 
            : 'Henüz mesaj gönderilmedi'}
        </Text>
      </View>
      
      <TouchableOpacity style={styles.chatButton} onPress={handleStartChat}>
        <Text style={styles.chatButtonText}>Sohbete Başla</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2d3748',
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
  },
  aiStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ade80',
    marginRight: 8,
  },
  statusText: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoContainer: {
    marginBottom: 16,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 8,
  },
  highlightText: {
    color: '#4299e1',
    fontWeight: 'bold',
  },
  messageCount: {
    color: '#a0aec0',
    fontSize: 14,
  },
  chatButton: {
    backgroundColor: '#4299e1',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AIVAComponent;