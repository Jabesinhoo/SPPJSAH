const { Spreadsheet, SpreadsheetColumn, SpreadsheetRow, SpreadsheetCell } = require('../models');
const { Op } = require('sequelize');

class SpreadsheetController {

  // Obtener todas las hojas de cálculo del usuario
  static async getAllSpreadsheets(req, res) {
    try {
      const { userId } = req.session;
      const spreadsheets = await Spreadsheet.findAll({
        where: { userUuid: req.session.userId, isActive: true }, // ✅ userUuid
        include: [
          {
            model: SpreadsheetColumn,
            as: 'columns',
            attributes: ['id', 'name', 'columnType']
          }
        ],
        order: [['createdAt', 'DESC']]
      });


      res.json({
        success: true,
        data: spreadsheets
      });
    } catch (error) {
      console.error('Error al obtener spreadsheets:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las hojas de cálculo',
        error: error.message
      });
    }
  }

  // Crear nueva hoja de cálculo
  static async createSpreadsheet(req, res) {
    try {
      const { userId } = req.session;
      const { name, description } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'El nombre es requerido'
        });
      }

      const spreadsheet = await Spreadsheet.create({
        name: name.trim(),
        description: description?.trim() || '',
        userUuid: req.session.userId, // ✅ userUuid
        isActive: true
      });


      res.status(201).json({
        success: true,
        message: 'Hoja de cálculo creada exitosamente',
        data: spreadsheet
      });
    } catch (error) {
      console.error('Error al crear spreadsheet:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear la hoja de cálculo',
        error: error.message
      });
    }
  }

  // Obtener una hoja de cálculo específica con sus datos
  static async getSpreadsheet(req, res) {
  try {
    const { id } = req.params;
    const { userId } = req.session;

    const spreadsheet = await Spreadsheet.findOne({
      where: { id, userUuid: userId, isActive: true }, // ✅ corregido
      include: [
        {
          model: SpreadsheetColumn,
          as: 'columns',
          order: [['position', 'ASC']]
        },
        {
          model: SpreadsheetRow,
          as: 'rows',
          include: [
            {
              model: SpreadsheetCell,
              as: 'cells',
              include: [
                {
                  model: SpreadsheetColumn,
                  as: 'column',
                  attributes: ['id', 'name', 'columnType']
                }
              ]
            }
          ],
          order: [['position', 'ASC']]
        }
      ]
    });

    if (!spreadsheet) {
      return res.status(404).json({
        success: false,
        message: 'Hoja de cálculo no encontrada'
      });
    }

    res.json({
      success: true,
      data: spreadsheet
    });
  } catch (error) {
    console.error('Error al obtener spreadsheet:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la hoja de cálculo',
      error: error.message
    });
  }
}


  // Agregar columna
  static async addColumn(req, res) {
    try {
      const { spreadsheetId } = req.params;
      const { userId } = req.session;
      const { name, columnType, isRequired, defaultValue, selectOptions, width } = req.body;

      // Verificar que el usuario sea propietario
      const spreadsheet = await Spreadsheet.findOne({
        where: { id: spreadsheetId, userUuid: req.session.userId }  // ✅
      });

      if (!spreadsheet) {
        return res.status(404).json({
          success: false,
          message: 'Hoja de cálculo no encontrada'
        });
      }

      // Obtener la siguiente posición
      const maxPosition = await SpreadsheetColumn.max('position', {
        where: { spreadsheetId }
      }) || 0;

      const columnData = {
        spreadsheetId,
        name: name?.trim(),
        columnType: columnType || 'text',
        isRequired: isRequired || false,
        defaultValue: defaultValue || null,
        position: maxPosition + 1,
        width: width || 150
      };

      // Validar opciones de select
      if (columnType === 'select') {
        if (!selectOptions || !Array.isArray(selectOptions) || selectOptions.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Las opciones de select son requeridas'
          });
        }
        columnData.selectOptions = selectOptions;
      }

      const column = await SpreadsheetColumn.create(columnData);

      // Si hay filas existentes, crear celdas vacías para esta columna
      const existingRows = await SpreadsheetRow.findAll({
        where: { spreadsheetId }
      });

      if (existingRows.length > 0) {
        const cellsToCreate = existingRows.map(row => ({
          rowId: row.id,
          columnId: column.id,
          value: defaultValue || ''
        }));

        await SpreadsheetCell.bulkCreate(cellsToCreate);
      }

      res.status(201).json({
        success: true,
        message: 'Columna agregada exitosamente',
        data: column
      });
    } catch (error) {
      console.error('Error al agregar columna:', error);
      res.status(500).json({
        success: false,
        message: 'Error al agregar la columna',
        error: error.message
      });
    }
  }

  // Agregar fila
  static async addRow(req, res) {
    try {
      const { spreadsheetId } = req.params;
      const { userId } = req.session;

      // Verificar que el usuario sea propietario
      const spreadsheet = await Spreadsheet.findOne({
        where: { id: spreadsheetId, userUuid: req.session.userId }
      });

      if (!spreadsheet) {
        return res.status(404).json({
          success: false,
          message: 'Hoja de cálculo no encontrada'
        });
      }

      // Obtener la siguiente posición
      const maxPosition = await SpreadsheetRow.max('position', {
        where: { spreadsheetId }
      }) || 0;

      const row = await SpreadsheetRow.create({
        spreadsheetId,
        position: maxPosition + 1
      });

      // Crear celdas vacías para todas las columnas existentes
      const columns = await SpreadsheetColumn.findAll({
        where: { spreadsheetId }
      });

      if (columns.length > 0) {
        const cellsToCreate = columns.map(column => ({
          rowId: row.id,
          columnId: column.id,
          value: column.defaultValue || ''
        }));

        await SpreadsheetCell.bulkCreate(cellsToCreate);
      }

      res.status(201).json({
        success: true,
        message: 'Fila agregada exitosamente',
        data: row
      });
    } catch (error) {
      console.error('Error al agregar fila:', error);
      res.status(500).json({
        success: false,
        message: 'Error al agregar la fila',
        error: error.message
      });
    }
  }

  // Actualizar celda
  static async updateCell(req, res) {
    try {
      const { rowId, columnId } = req.params;
      const { value } = req.body;
      const { userId } = req.session;

      // Verificar que la celda pertenezca al usuario
      const cell = await SpreadsheetCell.findOne({
        where: { rowId, columnId },
        include: [
          {
            model: SpreadsheetRow,
            as: 'row',
            include: [
              {
                model: Spreadsheet,
                as: 'spreadsheet',
                where: { userUuid: req.session.userId }   // ✅ corregido
              }
            ]
          },
          {
            model: SpreadsheetColumn,
            as: 'column'
          }
        ]
      });

      if (!cell) {
        return res.status(404).json({
          success: false,
          message: 'Celda no encontrada'
        });
      }

      // Validar el valor según el tipo de columna
      const columnType = cell.column.columnType;
      let validatedValue = value;

      switch (columnType) {
        case 'number':
          if (value && isNaN(value)) {
            return res.status(400).json({
              success: false,
              message: 'El valor debe ser un número'
            });
          }
          validatedValue = value ? parseInt(value) : '';
          break;

        case 'decimal':
          if (value && isNaN(parseFloat(value))) {
            return res.status(400).json({
              success: false,
              message: 'El valor debe ser un número decimal'
            });
          }
          validatedValue = value ? parseFloat(value) : '';
          break;

        case 'boolean':
          validatedValue = value === 'true' || value === true ? 'true' : 'false';
          break;

        case 'select':
          if (value && !cell.column.selectOptions?.includes(value)) {
            return res.status(400).json({
              success: false,
              message: 'El valor seleccionado no es válido'
            });
          }
          break;

        case 'email':
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return res.status(400).json({
              success: false,
              message: 'El formato de email no es válido'
            });
          }
          break;

        case 'url':
          if (value && !/^https?:\/\/.+/.test(value)) {
            return res.status(400).json({
              success: false,
              message: 'El formato de URL no es válido'
            });
          }
          break;
      }

      await cell.update({ value: validatedValue });

      res.json({
        success: true,
        message: 'Celda actualizada exitosamente',
        data: { value: validatedValue }
      });
    } catch (error) {
      console.error('Error al actualizar celda:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar la celda',
        error: error.message
      });
    }
  }

  // Eliminar columna
  static async deleteColumn(req, res) {
    try {
      const { spreadsheetId, columnId } = req.params;
      const { userId } = req.session;

      // Verificar que el usuario sea propietario
      const spreadsheet = await Spreadsheet.findOne({
      where: { id: spreadsheetId, userUuid: req.session.userId }
      });

      if (!spreadsheet) {
        return res.status(404).json({
          success: false,
          message: 'Hoja de cálculo no encontrada'
        });
      }

      const column = await SpreadsheetColumn.findOne({
        where: { id: columnId, spreadsheetId }
      });

      if (!column) {
        return res.status(404).json({
          success: false,
          message: 'Columna no encontrada'
        });
      }

      await column.destroy();

      res.json({
        success: true,
        message: 'Columna eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar columna:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar la columna',
        error: error.message
      });
    }
  }

  // Eliminar fila
  static async deleteRow(req, res) {
    try {
      const { spreadsheetId, rowId } = req.params;
      const { userId } = req.session;

      // Verificar que el usuario sea propietario
      const spreadsheet = await Spreadsheet.findOne({
      where: { id: spreadsheetId, userUuid: req.session.userId }
      });

      if (!spreadsheet) {
        return res.status(404).json({
          success: false,
          message: 'Hoja de cálculo no encontrada'
        });
      }

      const row = await SpreadsheetRow.findOne({
        where: { id: rowId, spreadsheetId }
      });

      if (!row) {
        return res.status(404).json({
          success: false,
          message: 'Fila no encontrada'
        });
      }

      await row.destroy();

      res.json({
        success: true,
        message: 'Fila eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar fila:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar la fila',
        error: error.message
      });
    }
  }

  // Eliminar spreadsheet
  static async deleteSpreadsheet(req, res) {
    try {
      const { id } = req.params;
      const { userId } = req.session;

      const spreadsheet = await Spreadsheet.findOne({
        where: { id: spreadsheetId, userUuid: req.session.userId }
      });

      if (!spreadsheet) {
        return res.status(404).json({
          success: false,
          message: 'Hoja de cálculo no encontrada'
        });
      }

      await spreadsheet.update({ isActive: false });

      res.json({
        success: true,
        message: 'Hoja de cálculo eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar spreadsheet:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar la hoja de cálculo',
        error: error.message
      });
    }
  }
}

module.exports = SpreadsheetController;