const express = require('express');
const app = express();
const PORT = process.env.PORT || 8000;

let code = require('./util/pair');
const router = require('./util/qr');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/code', code);

app.use('/', (req, res) => {
    res.sendFile('./public/pair');
});

app.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});
