const express = require('express');
const app = express();
const PORT = process.env.PORT || 8000;

let code = require('./utils/pair');
let sessions = require('./utils/sessions');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/code', code);
app.use('/sessions', sessions);

app.use('/', (req, res) => {
    res.sendFile('./public/pair');
});

app.listen(PORT, () => {
    console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});
