// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Configuración de almacenamiento
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
    const uniqueName = `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`;
    console.log('🖼️ [UPLOAD] Generado nombre de archivo:', uniqueName);
    cb(null, uniqueName);
  }
});

// Validación de archivos
const fileFilter = (req, file, cb) => {
  console.log('🔎 [UPLOAD] Revisando mimetype:', file.mimetype);

  // Validar tipo MIME
  if (!file.mimetype?.startsWith('image/')) {
    return cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)'), false);
  }

  // Validar extensión
  const allowedExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExt.includes(ext)) {
    return cb(new Error('Extensión de archivo no permitida'), false);
  }

  cb(null, true);
};

// Middleware principal de subida
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// Middleware para capturar errores de Multer
function uploadErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    console.error('❌ [UPLOAD] MulterError:', err);
    return res.status(400).json({ error: `Error de subida: ${err.message}` });
  } else if (err) {
    console.error('❌ [UPLOAD] Error:', err);
    return res.status(400).json({ error: err.message });
  }
  next();
}

module.exports = { upload, uploadErrorHandler };
