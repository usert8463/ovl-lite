const { delete_session } = require('./fonctions');
const express = require('express');
const app = express.Router();

app.get('/', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).send({ error: 'Paramètre "id" requis' });

  const success = await delete_session(id);
  if (success) {
    res.send({ message: `✅ Session ${id} supprimée avec succès.` });
  } else {
    res.status(404).send({ error: `❌ Session ${id} introuvable.` });
  }
});

module.exports = app;
