const { Pool } = require('pg');
const { user, password, host, database, port } = require('../secrets/db_configuration.js');

const pool = new Pool({ user, host, database, port });

module.exports = pool;



