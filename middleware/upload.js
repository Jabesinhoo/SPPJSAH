// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Extensiones permitidas
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 📌 Permitir subir a diferentes carpetas según tipo
    const folder = req.uploadType || 'suppliers'; 
    const uploadPath = path.join(__dirname, `../public/uploads/${folder}`);

    try {
      if (!fs.existsSync(uploadPath)) {
        console.log('📁 [UPLOAD] Carpeta no existe, creando:', uploadPath);
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    } catch (e) {
      console.error('❌ [UPLOAD] Error creando carpeta:', e);
      cb(e);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    console.log('🖼️ [UPLOAD] Generado nombre de archivo:', uniqueName);
    cb(null, uniqueName);
  }
});

// Validador de archivos
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  console.log('🔎 [UPLOAD] Revisando mimetype:', file.mimetype, 'ext:', ext);

  if (file.mimetype?.startsWith('image/') && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Solo se permiten imágenes válidas (.jpg, .jpeg, .png, .gif, .webp)'));
  }
};

// Configuración final
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // ⚠️ bajé a 2MB (ajústalo si quieres)
});

// Middleware para manejo elegante de errores de Multer
const uploadMiddleware = (fieldName, maxCount = 1) => {
  return (req, res, next) => {
    const handler = upload.array(fieldName, maxCount);
    handler(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error('❌ [UPLOAD] Error Multer:', err.message);
        return res.status(400).json({ error: err.message });
      } else if (err) {
        console.error('❌ [UPLOAD] Error general:', err.message);
        return res.status(400).json({ error: 'Archivo no válido' });
      }
      next();
    });
  };
};

module.exports = { upload, uploadMiddleware };
