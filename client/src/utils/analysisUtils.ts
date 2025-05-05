// src/utils/analysisUtils.ts
import { ChatMessage } from './openai';
import { UserMemory } from '@/store/userStore';

// Türkçe konu kategorileri ve ilgili anahtar kelimeler
const topicKeywords: Record<string, string[]> = {
  "teknoloji": ["bilgisayar", "yazılım", "kod", "program", "uygulama", "teknoloji", "internet", "web", "mobil", "yapay zeka", "ai", "robot", "elektronik"],
  "spor": ["futbol", "basketbol", "voleybol", "koşu", "antrenman", "maç", "spor", "fitness", "egzersiz", "yüzme", "tenis", "bisiklet"],
  "müzik": ["şarkı", "müzik", "konser", "melodi", "nota", "enstrüman", "gitar", "piyano", "albüm", "playlist", "spotify", "dinlemek"],
  "film": ["film", "sinema", "dizi", "netflix", "izlemek", "oyuncu", "yönetmen", "senaryo", "hollywood", "oscar", "televizyon", "belgesel"],
  "seyahat": ["seyahat", "gezi", "tatil", "turizm", "otel", "plaj", "uçak", "bilet", "ülke", "şehir", "yurt dışı", "gezgin"],
  "yemek": ["yemek", "tarif", "mutfak", "pişirmek", "lezzet", "restoran", "cafe", "şef", "tatlı", "kahve", "çay", "içecek"],
  "eğitim": ["okul", "üniversite", "öğrenmek", "eğitim", "kurs", "sınav", "kitap", "ders", "öğretmen", "akademik", "ödev", "proje"],
  "sanat": ["sanat", "resim", "çizim", "tasarım", "fotoğraf", "sergi", "galeri", "heykel", "mimari", "görsel", "grafik", "illüstrasyon"],
  "sağlık": ["sağlık", "hastalık", "doktor", "hastane", "ilaç", "tedavi", "spor", "diyet", "beslenme", "uyku", "stres", "psikoloji"],
  "iş": ["iş", "kariyer", "şirket", "ofis", "toplantı", "yönetici", "çalışmak", "maaş", "işveren", "müşteri", "pazarlama", "proje"],
  "oyun": ["oyun", "gamer", "konsol", "playstation", "xbox", "pc", "steam", "minecraft", "fps", "moba", "rpg", "strateji"],
  "bilim": ["bilim", "fizik", "kimya", "biyoloji", "matematik", "astronomi", "uzay", "deney", "araştırma", "teori", "laboratuvar", "atom"],
  "doğa": ["doğa", "çevre", "hayvan", "bitki", "ağaç", "çiçek", "orman", "dağ", "deniz", "göl", "nehir", "ekoloji", "iklim"],
  "aile": ["aile", "anne", "baba", "kardeş", "çocuk", "bebek", "ebeveyn", "evlilik", "nişan", "akraba", "ev", "yuva"],
  "moda": ["moda", "giyim", "kıyafet", "stil", "tasarım", "marka", "ayakkabı", "çanta", "aksesuar", "takı", "alışveriş", "trend"]
};

/**
 * Kullanıcı mesajından anahtar konuları çıkarır
 * @param message Analiz edilecek mesaj
 * @returns Tespit edilen konular dizisi
 */
export function extractTopics(message: string): string[] {
  const messageLower = message.toLowerCase();
  const foundTopics: string[] = [];
  
  Object.entries(topicKeywords).forEach(([topic, keywords]) => {
    if (keywords.some(word => messageLower.includes(word))) {
      foundTopics.push(topic);
    }
  });
  
  return foundTopics;
}

/**
 * Kullanıcının sevdiği ve sevmediği şeyleri tespit eder
 * @param message Kullanıcı mesajı
 * @returns Sevilen ve sevilmeyen şeyler
 */
export function extractPreferences(message: string): { liked: string[], disliked: string[] } {
  const messageLower = message.toLowerCase();
  const liked: string[] = [];
  const disliked: string[] = [];
  
  // Sevilen şeyleri bul
  const likePatterns = [
    /(?:sev(?:iyor|dim|erim)|hoşlan(?:ıyor|dım|ırım)) ([^\.,:;!?]+)/g,
    /([^\.,:;!?]+) (?:çok güzel|harika|muhteşem|mükemmel)/g
  ];
  
  // Sevilmeyen şeyleri bul
  const dislikePatterns = [
    /(?:sev(?:mi(?:yor|dim|em))|hoşlan(?:mıyor|madım|mam)) ([^\.,:;!?]+)/g,
    /([^\.,:;!?]+) (?:kötü|berbat|çirkin|korkunç|hiç iyi değil)/g
  ];
  
  // Tüm eşleşmeleri bul
  likePatterns.forEach(pattern => {
    const matches = [...messageLower.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1]) {
        liked.push(match[1].trim());
      }
    });
  });
  
  dislikePatterns.forEach(pattern => {
    const matches = [...messageLower.matchAll(pattern)];
    matches.forEach(match => {
      if (match[1]) {
        disliked.push(match[1].trim());
      }
    });
  });
  
  return { liked, disliked };
}

/**
 * Kullanıcının bahsettiği kişi isimlerini çıkarır
 * @param message Kullanıcı mesajı
 * @returns Tespit edilen isimler
 */
export function extractNames(message: string): string[] {
  const matches = message.match(/(?:arkadaşım|dostum|abim|ablam|kardeşim) ([A-Z][a-zğüşıöçİĞÜŞÖÇ]+)/g) || [];
  
  return matches.map(match => {
    const parts = match.split(' ');
    return parts[parts.length - 1];
  });
}

/**
 * Sohbet geçmişi ve kullanıcı belleğinden kişiselleştirilmiş sistem mesajı oluşturur
 * @param name Kullanıcı adı
 * @param interests İlgi alanları
 * @param memory Kullanıcı belleği
 * @param history Mesaj geçmişi
 * @returns Kişiselleştirilmiş sistem mesajı
 */
export function generatePersonalizedSystemMessage(
  name: string, 
  interests: string, 
  memory: UserMemory,
  history: ChatMessage[]
): string {
  // Kullanıcının en çok konuştuğu 3 konuyu bul
  const topTopics = Object.entries(memory.topics || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic)
    .join(", ");
  
  // Konuşma tarzı analizi
  const messageStyle = memory.conversationStyle.avgLength > 100 
    ? "detaylı ve uzun cümleler kurmayı seven" 
    : "kısa ve öz konuşmayı tercih eden";
  
  const emojis = memory.conversationStyle.usesEmoji 
    ? "emoji kullanmayı seven" 
    : "genellikle emoji kullanmayan";
  
  const tone = memory.conversationStyle.formal 
    ? "resmi bir dil kullanan" 
    : "samimi ve rahat konuşan";
    
  // Kişiselleştirilmiş sistem mesajı
  return `Sen AIVA adında Türkçe konuşan yardımcı ve cana yakın bir yapay zekasın.

KULLANICI BİLGİLERİ:
Kullanıcının adı: ${name || 'Bilinmiyor'}
İlgi alanları: ${interests || 'Bilinmiyor'}
En çok konuştuğu konular: ${topTopics || 'Henüz tespit edilmedi'}
Sevdiği şeyler: ${memory.likedThings.join(', ') || 'Henüz bilmiyoruz'}
Sevmediği şeyler: ${memory.dislikedThings.join(', ') || 'Henüz bilmiyoruz'}
Bahsettiği kişiler: ${memory.mentionedNames.join(', ') || 'Henüz kimseyi anmadı'}

KONUŞMA TARZI:
${messageStyle}, ${emojis}, ${tone} bir kullanıcı ile konuşuyorsun.

YANITLAMA TARZI:
1. Sohbeti doğal ve samimi tut. Gerçek bir arkadaş gibi davran.
2. Kullanıcının ilgi alanlarına ve sık konuştuğu konulara atıfta bulun.
3. Bahsettiği kişileri hatırla ve sohbette kullan.
4. Kullanıcının tarzına uygun yanıtlar ver (${messageStyle}, ${emojis}, ${tone}).
5. Cevaplarını kısa (1-3 cümle) ve Türkçe olarak ver.
6. Arada kullanıcının adını kullanarak hitap et.
7. Önceki konuşmalardan öğrendiğin bilgileri kullan.

Kullanıcının yazdıklarını doğru anladığını göster ve empati kur. Her zaman yardımsever, bilgilendirici ve arkadaşça ol.`;
}

/**
 * Kullanıcının mesajını analiz eder ve belleği günceller
 * @param message Kullanıcı mesajı
 * @param updateUserMemory Belleği güncelleyen fonksiyon
 */
export function analyzeUserMessage(
  message: string,
  updateUserMemory: {
    addTopic: (topic: string) => void;
    addLikedThing: (thing: string) => void;
    addDislikedThing: (thing: string) => void;
    addMentionedName: (name: string) => void;
    updateConversationStyle: (message: string) => void;
  }
): void {
  // Konuşma tarzını güncelle
  updateUserMemory.updateConversationStyle(message);
  
  // Konuları çıkar ve güncelle
  const topics = extractTopics(message);
  topics.forEach(topic => {
    updateUserMemory.addTopic(topic);
  });
  
  // Tercihleri çıkar ve güncelle
  const { liked, disliked } = extractPreferences(message);
  liked.forEach(thing => {
    updateUserMemory.addLikedThing(thing);
  });
  
  disliked.forEach(thing => {
    updateUserMemory.addDislikedThing(thing);
  });
  
  // İsimleri çıkar ve güncelle
  const names = extractNames(message);
  names.forEach(name => {
    updateUserMemory.addMentionedName(name);
  });
}