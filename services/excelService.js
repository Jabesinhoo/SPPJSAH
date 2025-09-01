// services/excelService.js
const XLSX = require('xlsx');
const path = require('path');

class ExcelService {
    constructor() {
        this.excelData = null;
        this.filePath = path.join(__dirname, '../Excel/actualizada.xlsx');
        this.loadExcelData();
    }

    loadExcelData() {
        try {
            const workbook = XLSX.readFile(this.filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convertir a JSON
            this.excelData = XLSX.utils.sheet_to_json(worksheet);
            console.log('Datos de Excel cargados correctamente. Total de productos:', this.excelData.length);
        } catch (error) {
            console.error('Error al cargar el archivo Excel:', error);
            this.excelData = [];
        }
    }

    findProductBySKU(sku) {
        if (!this.excelData || this.excelData.length === 0) {
            return null;
        }

        // Buscar el SKU (case insensitive y sin espacios)
        const cleanSKU = sku.toString().trim().toLowerCase();
        
        const product = this.excelData.find(item => {
            if (!item.CódigoInventario) return false;
            const productSKU = item.CódigoInventario.toString().trim().toLowerCase();
            return productSKU === cleanSKU;
        });

        return product || null;
    }

    searchProductsBySKU(sku) {
        if (!this.excelData || this.excelData.length === 0) {
            return [];
        }

        const cleanSKU = sku.toString().trim().toLowerCase();
        
        return this.excelData.filter(item => {
            if (!item.CódigoInventario) return false;
            const productSKU = item.CódigoInventario.toString().trim().toLowerCase();
            return productSKU.includes(cleanSKU);
        }).slice(0, 10); // Limitar a 10 resultados
    }

    getAllSKUs() {
        if (!this.excelData || this.excelData.length === 0) {
            return [];
        }

        return this.excelData
            .filter(item => item.CódigoInventario)
            .map(item => item.CódigoInventario.toString().trim());
    }
}

module.exports = new ExcelService();