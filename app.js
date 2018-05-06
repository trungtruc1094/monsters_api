const express = require('express');
const monsters = require('./routes/monsters');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json());
app.use('/monsters', monsters);

app.use((err, req, res, next) => {
    res.json(err);
});

// const forceSSL = function() {
//     return function (req, res, next) {
//         if (req.headers['x-forwarded-proto'] !== 'https') {
//             return res.redirect(
//                 ['https://', req.get('Host'), req.url].join('')
//             );
//         }
//         next();
//     }
// }
 
// app.use(forceSSL());

module.exports = app;