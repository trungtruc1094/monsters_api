const { Pool } = require('pg');
const database_connect = require('../secrets/db_configuration.js');
const { user, password, host, database, port } = database_connect.db_local;

const pool = new Pool({ user, host, database, port });

module.exports = pool;



