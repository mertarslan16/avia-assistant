const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const apiRoutes = require('./routers/api');

// Environment değişkenlerini yükle
dotenv.config();

// Express uygulamasını oluştur
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware'leri ekle
app.use(cors());
app.use(express.json());  // Bu satırı ekleyin veya kontrol edin
app.use(express.urlencoded({ extended: true }));  // Bu satırı ekleyin veya kontrol edin

// API route'larını tanımla
app.use('/api', apiRoutes);

// Kök dizin için basit bir yanıt
app.get('/', (req, res) => {
  res.json({ message: 'Avia Assistant API\'sine Hoş Geldiniz!' });
});

// MongoDB bağlantısını kur
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB\'ye başarıyla bağlandı!');
    // Server'ı başlat
    app.listen(PORT, () => {
      console.log(`Server ${PORT} portunda çalışıyor. http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB bağlantı hatası:', err);
    process.exit(1);
  });

// Hata yakalama
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Bir hata oluştu!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Sunucu hatası'
  });
});