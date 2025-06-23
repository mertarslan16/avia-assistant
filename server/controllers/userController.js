// controllers/userController.js - Kullanıcı kontrolleri (Düzeltilmiş)

const User = require('../models/User');
const jwt = require('jsonwebtoken');

// JWT token oluşturma fonksiyonu
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Kullanıcı kaydı
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Gerekli alanları kontrol et
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'Kayıt hatası', 
        error: 'Kullanıcı adı, e-posta ve parola gereklidir' 
      });
    }
    
    // E-posta formatını kontrol et
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Kayıt hatası', 
        error: 'Geçersiz e-posta formatı' 
      });
    }
    
    // Parola uzunluğunu kontrol et
    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Kayıt hatası', 
        error: 'Parola en az 6 karakter olmalıdır' 
      });
    }
    
    // Kullanıcı adı veya e-posta zaten var mı kontrol et
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Kayıt hatası', 
        error: 'Bu kullanıcı adı veya e-posta zaten kullanılıyor' 
      });
    }
    
    // Yeni kullanıcı oluştur
    const newUser = new User({
      username,
      email,
      password
    });
    
    await newUser.save();
    
    // Token oluştur
    const token = generateToken(newUser._id);
    
    res.status(201).json({
      message: 'Kullanıcı başarıyla oluşturuldu',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        preferences: newUser.preferences
      }
    });
  } catch (err) {
    console.error('Kullanıcı kayıt hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
};

// Kullanıcı girişi
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Gerekli alanları kontrol et
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Giriş hatası', 
        error: 'E-posta ve parola gereklidir' 
      });
    }
    
    // Kullanıcıyı bul
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ message: 'Geçersiz kimlik bilgileri' });
    }
    
    // Parolayı kontrol et
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Geçersiz kimlik bilgileri' });
    }
    
    // Son giriş tarihini güncelle
    user.updatedAt = new Date();
    await user.save();
    
    // Token oluştur
    const token = generateToken(user._id);
    
    res.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        preferences: user.preferences
      }
    });
  } catch (err) {
    console.error('Kullanıcı giriş hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
};

// Kullanıcı profilini getir
exports.getProfile = async (req, res) => {
  try {
    // req.user middleware'den geliyor
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    
    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (err) {
    console.error('Profil getirme hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
};

// Kullanıcı profilini güncelle
exports.updateProfile = async (req, res) => {
  try {
    const { username, email, preferences } = req.body;
    const userId = req.userId;
    
    // Kullanıcı adı veya e-posta zaten başka bir kullanıcı tarafından kullanılıyor mu kontrol et
    if (username || email) {
      const existingUser = await User.findOne({
        _id: { $ne: userId },
        $or: [
          ...(username ? [{ username }] : []),
          ...(email ? [{ email }] : [])
        ]
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          message: 'Güncelleme hatası', 
          error: 'Bu kullanıcı adı veya e-posta zaten kullanılıyor' 
        });
      }
    }
    
    // E-posta formatını kontrol et
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          message: 'Güncelleme hatası', 
          error: 'Geçersiz e-posta formatı' 
        });
      }
    }
    
    // Güncellenecek alanları belirle
    const updateFields = {};
    
    if (username) updateFields.username = username;
    if (email) updateFields.email = email;
    if (preferences) {
      // Mevcut preferences ile birleştir
      const currentUser = await User.findById(userId);
      updateFields.preferences = {
        ...currentUser.preferences,
        ...preferences
      };
    }
    
    updateFields.updatedAt = new Date();
    
    // Kullanıcıyı güncelle
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    
    res.json({
      message: 'Profil başarıyla güncellendi',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        preferences: updatedUser.preferences
      }
    });
  } catch (err) {
    console.error('Profil güncelleme hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
};

// Parola değiştirme
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Parola değiştirme hatası', 
        error: 'Mevcut parola ve yeni parola gereklidir' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'Parola değiştirme hatası', 
        error: 'Yeni parola en az 6 karakter olmalıdır' 
      });
    }
    
    // Kullanıcıyı bul
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    
    // Mevcut parolayı kontrol et
    const isMatch = await user.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Mevcut parola hatalı' });
    }
    
    // Yeni parolayı ayarla
    user.password = newPassword;
    user.updatedAt = new Date();
    await user.save();
    
    res.json({ message: 'Parola başarıyla değiştirildi' });
  } catch (err) {
    console.error('Parola değiştirme hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
};

module.exports = exports;