'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // ==========================
    // ROLES
    // ==========================
    await queryInterface.createTable('roles', {
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        allowNull: false,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // ==========================
    // USERS
    // ==========================
    await queryInterface.createTable('users', {
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        allowNull: false,
        primaryKey: true
      },
      username: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      email: {
        type: Sequelize.STRING(150),
        allowNull: true,
        unique: true
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      profilePicture: {
        type: Sequelize.STRING,
        allowNull: true
      },
      roleUuid: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'roles',
          key: 'uuid'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      isApproved: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'pending'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // ==========================
    // USER ROLES
    // ==========================
    await queryInterface.createTable('user_roles', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      userUuid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'uuid'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      roleUuid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'uuid'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addConstraint('user_roles', {
      fields: ['userUuid', 'roleUuid'],
      type: 'unique',
      name: 'user_roles_unique'
    });

    // ==========================
    // PRODUCTS
    // ==========================
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        allowNull: false,
        primaryKey: true
      },
      SKU: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      nombre: {
        type: Sequelize.STRING(250),
        allowNull: false
      },
      cantidad: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      importancia: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      categoria: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'Faltantes'
      },
      precio_compra: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0
      },
      proveedor: {
        type: Sequelize.STRING(150),
        allowNull: true,
        defaultValue: 'N/A'
      },
      brand: {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: 'N/A'
      },
      listo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      usuario: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      nota: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('products', ['SKU'], {
      name: 'products_sku_idx'
    });

    await queryInterface.addIndex('products', ['categoria'], {
      name: 'products_categoria_idx'
    });

    // ==========================
    // PRODUCT HISTORIES
    // ==========================
    await queryInterface.createTable('product_histories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        allowNull: false,
        primaryKey: true
      },
      productId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      oldData: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      newData: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      changedFields: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      userId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      userName: {
        type: Sequelize.STRING,
        allowNull: true
      },
      bulkOperationId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('product_histories', ['productId'], {
      name: 'product_histories_productId_idx'
    });

    await queryInterface.addIndex('product_histories', ['createdAt'], {
      name: 'product_histories_createdAt_idx'
    });

    // ==========================
    // SUPPLIERS
    // ==========================
    await queryInterface.createTable('suppliers', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
      },
      marca: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      categoria: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      nombre: {
        type: Sequelize.STRING(200),
        allowNull: false,
        unique: true
      },
      celular: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      correo: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      ciudad: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      tipoAsesor: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'Asesor general Mayorista'
      },
      nombreEmpresa: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      nota: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      imagen: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('suppliers', ['categoria'], {
      name: 'suppliers_categoria_idx'
    });

    await queryInterface.addIndex('suppliers', ['ciudad'], {
      name: 'suppliers_ciudad_idx'
    });

    // ==========================
    // SPREADSHEETS
    // ==========================
    await queryInterface.createTable('spreadsheets', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      userUuid: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'uuid'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.createTable('spreadsheet_columns', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      spreadsheetId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'spreadsheets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      columnType: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'text'
      },
      isRequired: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      defaultValue: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      selectOptions: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      width: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 150
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.createTable('spreadsheet_rows', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      spreadsheetId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'spreadsheets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.createTable('spreadsheet_cells', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      rowId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'spreadsheet_rows',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      columnId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'spreadsheet_columns',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      value: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // ==========================
    // NOTIFICATIONS
    // ==========================
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      recipientId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'uuid'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      senderId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'uuid'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'mention'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: 'Notificación'
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      redirectUrl: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      link: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      isRead: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('notifications', ['recipientId'], {
      name: 'notifications_recipientId_idx'
    });

    await queryInterface.addIndex('notifications', ['senderId'], {
      name: 'notifications_senderId_idx'
    });

    await queryInterface.addIndex('notifications', ['isRead'], {
      name: 'notifications_isRead_idx'
    });

    // ==========================
    // TRANSPORTES
    // ==========================
    await queryInterface.createTable('transportes', {
      placa: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true
      },
      nombre_conductor: {
        type: Sequelize.STRING,
        allowNull: false
      },
      telefono: {
        type: Sequelize.STRING,
        allowNull: false
      },
      tipo_vehiculo: {
        type: Sequelize.STRING,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // ==========================
    // OUTSOURCES
    // ==========================
    await queryInterface.createTable('outsources', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      nombre_tecnico: {
        type: Sequelize.STRING,
        allowNull: false
      },
      telefono: {
        type: Sequelize.STRING,
        allowNull: false
      },
      cc: {
        type: Sequelize.BIGINT,
        allowNull: false,
        unique: true
      },
      sku: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true
      },
      tipo_servicio: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // ==========================
    // WOO STOCK SNAPSHOTS
    // ==========================
    await queryInterface.createTable('woo_stock_snapshots', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      woo_product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true
      },
      sku: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      last_stock: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      last_stock_status: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      last_checked_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('woo_stock_snapshots', ['sku'], {
      name: 'woo_stock_snapshots_sku_idx'
    });

    // ==========================
    // STOCK ZERO EVENTS
    // ==========================
    await queryInterface.createTable('stock_zero_events', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      woo_product_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      sku: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      previous_stock: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      current_stock: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      stock_status: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      event_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'reviewed', 'product_created', 'ignored'),
        allowNull: false,
        defaultValue: 'pending'
      },
      source: {
        type: Sequelize.ENUM('transition_to_zero', 'initial_zero'),
        allowNull: false,
        defaultValue: 'transition_to_zero'
      },
      reviewed_by: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      reviewed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('stock_zero_events', ['woo_product_id', 'event_date'], {
      unique: true,
      name: 'stock_zero_events_woo_product_id_event_date_unique'
    });

    await queryInterface.addIndex('stock_zero_events', ['event_date'], {
      name: 'stock_zero_events_event_date_idx'
    });

    await queryInterface.addIndex('stock_zero_events', ['status'], {
      name: 'stock_zero_events_status_idx'
    });

    // ==========================
    // SESSION TABLE
    // ==========================
    await queryInterface.createTable('session', {
      sid: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false
      },
      sess: {
        type: Sequelize.JSON,
        allowNull: false
      },
      expire: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('session', ['expire'], {
      name: 'session_expire_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('session');

    await queryInterface.dropTable('stock_zero_events');
    await queryInterface.dropTable('woo_stock_snapshots');

    await queryInterface.dropTable('outsources');
    await queryInterface.dropTable('transportes');

    await queryInterface.dropTable('notifications');

    await queryInterface.dropTable('spreadsheet_cells');
    await queryInterface.dropTable('spreadsheet_rows');
    await queryInterface.dropTable('spreadsheet_columns');
    await queryInterface.dropTable('spreadsheets');

    await queryInterface.dropTable('suppliers');

    await queryInterface.dropTable('product_histories');
    await queryInterface.dropTable('products');

    await queryInterface.dropTable('user_roles');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('roles');

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_stock_zero_events_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_stock_zero_events_source";');
  }
};