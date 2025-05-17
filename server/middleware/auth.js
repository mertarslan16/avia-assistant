const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    // Token'ı headerdan al
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Kimlik doğrulama hatası: Token bulunamadı' });
    }
    
    // Token'ı doğrula
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Kullanıcıyı bul
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Kimlik doğrulama hatası: Kullanıcı bulunamadı' });
    }
    
    // Kullanıcıyı request nesnesine ekle
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (err) {
    res.status(401).json({ message: 'Kimlik doğrulama hatası', error: err.message });
  }
};