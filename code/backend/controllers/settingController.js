const { db } = require('../config/firebase');

const getSettings = async (req, res) => {
  try {
    const docRef = db.collection('settings').doc('global');
    const doc = await docRef.get();
    
    if (!doc.exists) {
      // Default fallback
      const defaultSettings = {
        sports: ['Bóng đá', 'Tennis', 'Cầu lông', 'Bóng rổ', 'Pickleball'],
        amenities: ['Bãi đỗ xe', 'Phòng thay đồ & tắm', 'Đèn chiếu sáng', 'Wi-Fi', 'Cho thuê dụng cụ', 'Căn tin', 'Camera an ninh', 'Trọng tài']
      };
      await docRef.set(defaultSettings);
      return res.json(defaultSettings);
    }
    
    res.json(doc.data());
  } catch (error) {
    console.error('Lỗi lấy cài đặt:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { sports, amenities } = req.body;
    
    if (!sports || !amenities) {
      return res.status(400).json({ message: 'Thiếu dữ liệu.' });
    }
    
    const docRef = db.collection('settings').doc('global');
    await docRef.set({ sports, amenities }, { merge: true });
    
    res.json({ message: 'Cập nhật thành công', sports, amenities });
  } catch (error) {
    console.error('Lỗi cập nhật cài đặt:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
