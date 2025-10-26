const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const PORT = process.env.PORT || 8000;

const authDir = path.join(__dirname, 'auth');
if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
}

let code = require('./util/pair');
const router = require('./util/qr');
const session_id = require('./util/session_id');
const pginfo = require('./util/pginfo');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/code', code);
app.use('/qr', router);
app.use('/session_id', session_id);

app.use('/pginfo', pginfo);

app.use('/pair', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pair.html'));
});

app.use('/qrcode', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'qr.html'));
});

app.use('/plugin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'plugin.html'));
});

app.use('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

app.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});
