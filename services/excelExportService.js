// services/excelExportService.js - VERSIÓN SIMPLIFICADA SIN FILTRO "LISTO"
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const { Op } = require('sequelize');

class ExcelExportService {
  constructor() {
    this.ensureExportDirectory();
    this.Product = null;
    this.initDatabase();
  }

  async initDatabase() {
    try {
      const models = require('../models');
      this.Product = models.Product;
      
      if (this.Product) {
        logger.info('✅ Modelo Product cargado en servicio de exportación');
      } else {
        logger.warn('⚠️ Modelo Product no encontrado');
      }
    } catch (error) {
      logger.warn('⚠️ No se pudo cargar el modelo Product:', error.message);
    }
  }

  async ensureExportDirectory() {
    const exportDir = path.join(__dirname, '..', 'exports');
    try {
      await fs.mkdir(exportDir, { recursive: true });
      logger.info(`📁 Directorio de exportaciones listo: ${exportDir}`);
    } catch (err) {
      logger.error('Error al crear directorio de exportaciones:', err);
    }
  }

// En services/excelExportService.js, modifica el método exportProducts:
async exportProducts(filters = {}, options = {}) {
    try {
        logger.info('📊 Iniciando exportación de productos a Excel...');
        
        const {
            category = null
        } = filters;

        // NUEVO: Leer los campos específicos desde options
        const {
            includeCategoria = true,
            includeImportancia = true,
            includeEstado = true,
            includeUsuario = true,
            includeFecha = true,
            includeMarca = true,
            includePurchasePrice = true,
            includeSupplier = true,
            includeNotes = true
        } = options;

        let products = [];
        
        if (this.Product) {
            // Construir condiciones SIMPLIFICADAS
            const whereConditions = {};

            if (category && category !== 'Todas' && category !== '') {
                whereConditions.categoria = category;
            }

            logger.info('🔍 Condiciones de búsqueda:', whereConditions);
            
            try {
                products = await this.Product.findAll({
                    where: whereConditions,
                    order: [['createdAt', 'DESC']],
                    raw: true
                });
            } catch (queryError) {
                logger.error('❌ Error en consulta de productos:', queryError);
                products = await this.Product.findAll({
                    order: [['createdAt', 'DESC']],
                    raw: true
                });
            }
        } else {
            logger.error('❌ Modelo Product no disponible');
            throw new Error('No se pudo acceder a la base de datos');
        }

        logger.info(`✅ ${products.length} productos encontrados para exportar`);

        // Crear libro de Excel - SOLO UNA HOJA
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Sistema de Inventario';
        workbook.created = new Date();

        // ÚNICA HOJA: Productos
        const sheet = workbook.addWorksheet('Productos');

        // Definir columnas DINÁMICAMENTE según lo seleccionado
        const columns = [
            { header: 'SKU', key: 'sku', width: 20 },
            { header: 'Nombre', key: 'nombre', width: 30 },
            { header: 'Cantidad', key: 'cantidad', width: 12 }
        ];

        // Agregar columnas según lo seleccionado
        if (includeCategoria) {
            columns.push({ header: 'Categoría', key: 'categoria', width: 20 });
        }

        if (includeImportancia) {
            columns.push({ header: 'Importancia', key: 'importancia', width: 12 });
        }

        if (includeEstado) {
            columns.push({ header: 'Listo', key: 'listo', width: 10 });
        }

        if (includeUsuario) {
            columns.push({ header: 'Usuario', key: 'usuario', width: 15 });
        }

        if (includeFecha) {
            columns.push({ header: 'Fecha Creación', key: 'fechaCreacion', width: 20 });
        }

        if (includeMarca) {
            columns.push({ header: 'Marca', key: 'marca', width: 15 });
        }

        if (includePurchasePrice) {
            columns.push({ header: 'Precio Compra', key: 'precioCompra', width: 15 });
        }

        if (includeSupplier) {
            columns.push({ header: 'Proveedor', key: 'proveedor', width: 20 });
        }

        if (includeNotes) {
            columns.push({ header: 'Notas', key: 'notas', width: 40 });
        }

        sheet.columns = columns;

        // Estilo para el encabezado
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '4F46E5' }
        };

        // Llenar datos
        products.forEach((product) => {
            const rowData = {
                sku: product.SKU || '',
                nombre: product.nombre || '',
                cantidad: product.cantidad || 0
            };

            // Agregar campos condicionales
            if (includeCategoria) {
                rowData.categoria = product.categoria || '';
            }

            if (includeImportancia) {
                rowData.importancia = product.importancia || 0;
            }

            if (includeEstado) {
                rowData.listo = product.listo ? 'Sí' : 'No';
            }

            if (includeUsuario) {
                rowData.usuario = product.usuario || '';
            }

            if (includeFecha) {
                rowData.fechaCreacion = product.createdAt ? 
                    new Date(product.createdAt).toLocaleDateString('es-ES') : '';
            }

            if (includeMarca) {
                rowData.marca = product.brand || 'N/A';
            }

            if (includePurchasePrice) {
                rowData.precioCompra = product.precio_compra ? 
                    parseFloat(product.precio_compra).toFixed(2) : '0.00';
            }

            if (includeSupplier) {
                rowData.proveedor = product.proveedor || 'N/A';
            }

            if (includeNotes) {
                rowData.notas = this.extractNotes(product.nota);
            }

            const row = sheet.addRow(rowData);

            // Colorear celda de categoría si está incluida
            if (includeCategoria && product.categoria) {
                const categoriaCell = row.getCell('categoria');
                const categoryColor = this.getCategoryColor(product.categoria);
                categoriaCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: categoryColor }
                };
            }
        });

        // Autoajustar columnas
        sheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, cell => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = Math.min(maxLength + 2, 50);
        });

        // Generar nombre de archivo
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `productos_${timestamp}.xlsx`;
        const filepath = path.join(__dirname, '..', 'exports', filename);

        // Guardar archivo
        await workbook.xlsx.writeFile(filepath);
        logger.info(`✅ Archivo Excel generado: ${filepath}`);

        return {
            success: true,
            filename: filename,
            filepath: filepath,
            count: products.length
        };

    } catch (error) {
        logger.error('❌ Error al exportar productos a Excel:', error);
        throw error;
    }
}

  async getExportPreview(filters = {}) {
    try {
      const { category } = filters;
      
      let count = 0;
      let categoryStats = [];
      
      if (this.Product) {
        const whereConditions = {};
        
        if (category && category !== 'Todas' && category !== '') {
          whereConditions.categoria = category;
        }

        // Obtener conteo simple
        count = await this.Product.count({ where: whereConditions });
        
        // Obtener estadísticas básicas
        const stats = await this.Product.findAll({
          attributes: [
            'categoria',
            [this.Product.sequelize.fn('COUNT', this.Product.sequelize.col('id')), 'count']
          ],
          where: whereConditions,
          group: ['categoria'],
          raw: true,
          limit: 10
        });
        
        categoryStats = stats.map(stat => ({
          name: stat.categoria || 'Sin categoría',
          count: parseInt(stat.count) || 0
        }));
      }

      return {
        totalProducts: count,
        categories: categoryStats,
        estimatedSize: `${Math.ceil(count * 0.5)} KB`,
        filtersApplied: {
          category: category || 'Todas'
        }
      };
      
    } catch (error) {
      logger.error('Error en getExportPreview:', error);
      return {
        totalProducts: 0,
        categories: [],
        estimatedSize: '0 KB',
        filtersApplied: {
          category: filters.category || 'Todas'
        }
      };
    }
  }

  extractNotes(notesJson) {
    if (!notesJson) return '';
    
    try {
      const notes = JSON.parse(notesJson);
      if (Array.isArray(notes) && notes.length > 0) {
        // Tomar solo la última nota para no hacer muy larga la celda
        const lastNote = notes[notes.length - 1];
        return `${lastNote.user || 'Usuario'}: ${lastNote.text || ''}`;
      }
      return notesJson.toString().substring(0, 100); // Limitar a 100 caracteres
    } catch (e) {
      return notesJson ? notesJson.toString().substring(0, 100) : '';
    }
  }

  getCategoryColor(category) {
    const colors = {
      'Faltantes': 'EF4444',
      'Bajo Pedido': 'F59E0B',
      'Agotados con el Proveedor': 'F97316',
      'Demasiadas Existencias': '8B5CF6',
      'Realizado': '10B981',
      'Descontinuado': '6B7280',
      'Reemplazado': '14B8A6'
    };
    
    return colors[category] || '6B7280';
  }

  async listExports() {
    try {
      const exportDir = path.join(__dirname, '..', 'exports');
      const files = await fs.readdir(exportDir);
      
      const exportFiles = await Promise.all(
        files
          .filter(file => file.endsWith('.xlsx'))
          .map(async (file) => {
            const filepath = path.join(exportDir, file);
            const stats = await fs.stat(filepath);
            return {
              filename: file,
              filepath: filepath,
              size: stats.size,
              created: stats.birthtime,
              modified: stats.mtime
            };
          })
      );

      return exportFiles.sort((a, b) => b.created - a.created);
    } catch (error) {
      logger.error('Error al listar archivos de exportación:', error);
      return [];
    }
  }

  async deleteExport(filename) {
    try {
      const filepath = path.join(__dirname, '..', 'exports', filename);
      await fs.unlink(filepath);
      logger.info(`🗑️ Archivo eliminado: ${filename}`);
      return true;
    } catch (error) {
      logger.error(`Error al eliminar archivo ${filename}:`, error);
      return false;
    }
  }
}

module.exports = new ExcelExportService();