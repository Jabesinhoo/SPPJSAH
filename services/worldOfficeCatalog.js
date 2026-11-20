const sql = require('mssql');
const logger = require('../utils/logger');

const inventoryView = '[dbo].[Vista_Tabla_Inventarios]';
const skuColumn = 'LTRIM(RTRIM([CódigoInventario])) COLLATE Latin1_General_100_CI_AS';
const descriptionColumn = 'CONVERT(nvarchar(max), [Descripcion])';
const productColumns = `${skuColumn} AS sku, ${descriptionColumn} AS name`;

let poolPromise;

function getPool() {
    if (!poolPromise) {
        const env = process.env;
        const host = env.SQLSERVER_HOST?.trim() || env.WORLD_OFFICE_HOST?.trim();
        const server = env.SQLSERVER_ADDRESS?.trim() || host;
        const database = env.SQLSERVER_DATABASE || env.WORLD_OFFICE_DATABASE;
        const user = env.SQLSERVER_USER || env.WORLD_OFFICE_USER;
        const password = env.SQLSERVER_PASSWORD || env.WORLD_OFFICE_PASSWORD;
        const instanceName = env.SQLSERVER_INSTANCE?.trim() || env.WORLD_OFFICE_INSTANCE?.trim();
        const portValue = (env.SQLSERVER_PORT ?? env.WORLD_OFFICE_PORT)?.trim();
        const port = portValue ? Number(portValue) : 1433;

        if (env.SQLSERVER_ENABLED?.trim().toLowerCase() === 'false' ||
            !server || !database || !user || !password ||
            !Number.isInteger(port) || port < 1 || port > 65535) {
            throw Object.assign(new Error('Configuración de World Office incompleta o deshabilitada'), {
                code: 'WO_CONFIG'
            });
        }

        const options = {
            encrypt: true,
            trustServerCertificate: env.SQLSERVER_TRUST_SERVER_CERTIFICATE === 'true'
        };
        if (host && host !== server) options.serverName = host;
        if (instanceName && !portValue) options.instanceName = instanceName;

        const pool = new sql.ConnectionPool({
            server,
            ...(options.instanceName ? {} : { port }),
            database,
            user,
            password,
            connectionTimeout: 5000,
            requestTimeout: 5000,
            options,
            pool: { max: 5, min: 0 }
        });

        pool.on('error', error => {
            logger.warn('Error de conexión a World Office', { code: error.code });
        });
        poolPromise = pool.connect().catch(error => {
            poolPromise = undefined;
            throw error;
        });
    }

    return poolPromise;
}

async function searchProductsBySKU(sku) {
    const pool = await getPool();
    const { recordset } = await pool.request()
        .input('sku', sql.NVarChar(255), sku)
        .query(`
            SELECT TOP (10) sku, name
            FROM (
                SELECT DISTINCT ${productColumns}
                FROM ${inventoryView}
                WHERE CHARINDEX(@sku, ${skuColumn}) > 0
                    AND NULLIF(LTRIM(RTRIM(${descriptionColumn})), N'') IS NOT NULL
            ) AS matches
            ORDER BY CASE WHEN sku = @sku THEN 0 ELSE 1 END, sku, name
        `);
    return recordset;
}

module.exports = { searchProductsBySKU };
