const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8000;

let code = require('./utils/pair');
let sessions = require('./utils/sessions');
let sessions_dlt = require('./utils/sessions_dlt');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/code', code);
app.use('/sessions', sessions);
app.use('/dlt', sessions_dlt);

app.use('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pair.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Serveur en cours d'exécution sur http://localhost:${PORT}`);
});
