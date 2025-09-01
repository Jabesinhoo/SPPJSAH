// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads/suppliers');
    try {
      if (!fs.existsSync(uploadPath)) {
        console.log('📁 [UPLOAD] Carpeta no existe, creando:', uploadPath);
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      console.log('📁 [UPLOAD] Guardando en:', uploadPath);
      cb(null, uploadPath);
    } catch (e) {
      console.error('❌ [UPLOAD] Error creando carpeta:', e);
      cb(e);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    console.log('🖼️ [UPLOAD] Generado nombre de archivo:', uniqueName);
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  console.log('🔎 [UPLOAD] Revisando mimetype:', file.mimetype);
  if (file.mimetype?.startsWith('image/')) cb(null, true);
  else cb(new Error('Solo se permiten imágenes'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = upload;
