// controllers/excelExportController.js - VERSIÓN SIMPLIFICADA
const ExcelExportService = require('../services/excelExportService');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// En controllers/excelExportController.js, modifica exportToExcel:
exports.exportToExcel = async (req, res) => {
  try {
    const {
      category,
      // Campos opcionales
      includeCategoria,
      includeImportancia,
      includeEstado,
      includeUsuario,
      includeFecha,
      includeMarca,
      includePurchasePrice,
      includeSupplier,
      includeNotes
    } = req.query;

    const userRole = req.session.userRole;
    const username = req.session.username;

    logger.info(`📤 Usuario ${username} (${userRole}) solicitando exportación a Excel`);

    const filters = {
      category: category || null
    };

    // Pasar TODOS los campos como options
    const options = {
      includeCategoria: includeCategoria === 'true',
      includeImportancia: includeImportancia === 'true',
      includeEstado: includeEstado === 'true',
      includeUsuario: includeUsuario === 'true',
      includeFecha: includeFecha === 'true',
      includeMarca: includeMarca === 'true',
      includePurchasePrice: includePurchasePrice === 'true',
      includeSupplier: includeSupplier === 'true',
      includeNotes: includeNotes === 'true'
    };

    logger.info('⚙️ Filtros:', filters);
    logger.info('⚙️ Opciones:', options);

    const result = await ExcelExportService.exportProducts(filters, options);

    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Error al generar el archivo Excel'
      });
    }

    // Enviar archivo como descarga
    res.download(result.filepath, result.filename, (err) => {
      if (err) {
        logger.error('Error al descargar archivo:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error al descargar el archivo' });
        }
      } else {
        logger.info(`✅ Archivo ${result.filename} descargado por ${username}`);
      }
    });

  } catch (error) {
    logger.error('❌ Error en exportToExcel:', error);
    res.status(500).json({ 
      error: 'Error al generar el archivo Excel',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Función para limpiar archivos antiguos
exports.cleanOldExports = async () => {
  try {
    const exports = await ExcelExportService.listExports();
    if (exports.length > 10) {
      const toDelete = exports.slice(10);
      for (const file of toDelete) {
        await ExcelExportService.deleteExport(file.filename);
        logger.info(`🧹 Limpiado archivo antiguo: ${file.filename}`);
      }
    }
  } catch (error) {
    logger.error('Error limpiando archivos antiguos:', error);
  }
};

exports.downloadExport = async (req, res) => {
  try {
    const { filename } = req.params;

    if (!filename.endsWith('.xlsx')) {
      return res.status(400).json({ error: 'Formato de archivo no válido' });
    }

    const filepath = path.join(__dirname, '..', 'exports', filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.download(filepath, filename, (err) => {
      if (err) {
        logger.error('Error al descargar archivo existente:', err);
      }
    });

  } catch (error) {
    logger.error('Error en downloadExport:', error);
    res.status(500).json({ error: 'Error al descargar el archivo' });
  }
};

exports.listExports = async (req, res) => {
  try {
    const exports = await ExcelExportService.listExports();
    
    const formattedExports = exports.map(exp => ({
      filename: exp.filename,
      size: this.formatFileSize(exp.size),
      created: exp.created.toLocaleString('es-ES'),
      modified: exp.modified.toLocaleString('es-ES'),
      downloadUrl: `/api/excel/download/${exp.filename}`,
      deleteUrl: `/api/excel/delete/${exp.filename}`
    }));

    res.status(200).json({
      success: true,
      exports: formattedExports,
      count: formattedExports.length
    });

  } catch (error) {
    logger.error('Error en listExports:', error);
    res.status(500).json({ error: 'Error al listar exportaciones' });
  }
};

exports.deleteExport = async (req, res) => {
  try {
    const { filename } = req.params;
    const userRole = req.session.userRole;

    if (userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'No tienes permisos para eliminar archivos de exportación' 
      });
    }

    const success = await ExcelExportService.deleteExport(filename);

    if (success) {
      res.status(200).json({ 
        success: true, 
        message: `Archivo ${filename} eliminado correctamente` 
      });
    } else {
      res.status(404).json({ 
        error: 'No se pudo eliminar el archivo' 
      });
    }

  } catch (error) {
    logger.error('Error en deleteExport:', error);
    res.status(500).json({ error: 'Error al eliminar el archivo' });
  }
};

exports.exportPreview = async (req, res) => {
  try {
    const { category } = req.query;

    logger.info('📊 Generando vista previa de exportación...');

    // Usar el servicio para obtener la vista previa
    const previewData = await ExcelExportService.getExportPreview({
      category
    });
    
    res.status(200).json({
      success: true,
      preview: previewData
    });

  } catch (error) {
    logger.error('Error en exportPreview:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al generar vista previa',
      preview: {
        totalProducts: 0,
        categories: [],
        estimatedSize: '0 KB',
        filtersApplied: {
          category: req.query.category || 'Todas'
        }
      }
    });
  }
};

// Helper function
exports.formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};