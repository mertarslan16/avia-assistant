import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { Text } from '@/components/ThemedText';
import api from '@/utils/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  
  useEffect(() => {
    loadUserInfo();
    loadMessages();
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
  
  const loadMessages = async () => {
    try {
      const savedMessages = await AsyncStorage.getItem('chatMessages');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    } catch (error) {
      console.error('Mesaj yükleme hatası:', error);
    }
  };
  
  const saveMessages = async (newMessages: Message[]) => {
    try {
      await AsyncStorage.setItem('chatMessages', JSON.stringify(newMessages));
    } catch (error) {
      console.error('Mesaj kaydetme hatası:', error);
    }
  };
  
  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: Date.now(),
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);
    
    try {
      // Demo yanıt (backend bağlantısı olmadığında)
      setTimeout(() => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: `Merhaba! "${inputText}" mesajınızı aldım. Size nasıl yardımcı olabilirim?`,
          sender: 'ai',
          timestamp: Date.now(),
        };
        
        const newMessages = [...updatedMessages, aiResponse];
        setMessages(newMessages);
        saveMessages(newMessages);
        setIsLoading(false);
      }, 1000);
      
      // Gerçek API bağlantısı (şu an devre dışı)
      /*
      const response = await api.post('/ai/message', {
        message: inputText.trim()
      });
      
      const aiResponse: Message = {
        id: Date.now().toString(),
        text: response.data.message,
        sender: 'ai',
        timestamp: Date.now(),
      };
      
      const newMessages = [...updatedMessages, aiResponse];
      setMessages(newMessages);
      saveMessages(newMessages);
      */
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      setIsLoading(false);
    }
  };
  
  const speakMessage = async (text: string) => {
    try {
      if (isSpeaking) {
        await Speech.stop();
        setIsSpeaking(false);
      } else {
        setIsSpeaking(true);
        Speech.speak(text, {
          language: 'tr',
          onDone: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      }
    } catch (error) {
      console.error('Konuşma hatası:', error);
      setIsSpeaking(false);
    }
  };
  
  const renderMessageItem = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.sender === 'user' ? styles.userMessage : styles.aiMessage
    ]}>
      <Text style={styles.messageText}>{item.text}</Text>
      <View style={styles.messageFooter}>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        
        {item.sender === 'ai' && (
          <TouchableOpacity 
            style={styles.speakButton} 
            onPress={() => speakMessage(item.text)}
          >
            <Ionicons 
              name={isSpeaking ? "volume-mute" : "volume-medium"} 
              size={18} 
              color="#a0aec0" 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Karşılama mesajı
  const renderWelcomeMessage = () => {
    if (messages.length === 0) {
      return (
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitle}>
            Merhaba {username || 'Kullanıcı'}!
          </Text>
          <Text style={styles.welcomeText}>
            Ben AIVA, kişisel asistanınız. Size nasıl yardımcı olabilirim?
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'AIVA Asistan',
          headerStyle: {
            backgroundColor: '#1a202c',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }} 
      />
      <StatusBar style="light" />
      
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {renderWelcomeMessage()}
        
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={null}
        />
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Mesajınızı yazın..."
            placeholderTextColor="#718096"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.disabledButton]} 
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={24} color="white" />
            )}
          </TouchableOpacity>
        </View>
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
  },
  welcomeContainer: {
    padding: 16,
    backgroundColor: '#2d3748',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  welcomeTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeText: {
    color: '#cbd5e0',
    fontSize: 16,
    lineHeight: 22,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    backgroundColor: '#4299e1',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    backgroundColor: '#2d3748',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 6,
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginRight: 8,
  },
  speakButton: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#2d3748',
    borderTopWidth: 1,
    borderTopColor: '#4a5568',
  },
  input: {
    flex: 1,
    backgroundColor: '#4a5568',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4299e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#718096',
  },
});



