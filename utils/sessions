const { get_all_sessions } = require('./fonctions');
const express = require('express');
const app = express.Router();

app.get('/', async (req, res) => {
  const sessions = await get_all_sessions();
  res.send(sessions);
});

module.exports = app;
