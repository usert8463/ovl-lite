const express = require('express');
const fs = require('fs');
const pino = require("pino");
const path = require('path');
const {
  default: makeWASocket,
  delay,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  useMultiFileAuthState,
  Browsers
} = require("@whiskeysockets/baileys");

const {
  setSession,
  getFullSession,
  upload_session,
  deleteSession,
  scheduleSessionCleanup
} = require('./fonctions');

const app = express.Router();

app.get('/', async (req, res) => {
  const num = req.query.number;
  if (!num) return res.json({ error: 'Veuillez fournir un numéro de téléphone' });

  const instanceId = `session_${Date.now()}`;
  await ovl(num, res, instanceId);
});

async function ovl(num, res, instanceId, disconnect = false) {
  const sessionDir = path.join(__dirname, '../auth', instanceId);

  if (!disconnect && !fs.existsSync(sessionDir)) {
    await fs.promises.mkdir(sessionDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  let sessionDeleted = false;

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        pino({ level: 'fatal' }).child({ level: 'fatal' })
      )
    },
    logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
    browser: Browsers.ubuntu("Chrome"),
    markOnlineOnConnect: true
  });

  const isFirstLogin = !sock.authState.creds.registered;
  if (isFirstLogin && !disconnect) {
    await delay(1500);
    const numero = num.replace(/[^0-9]/g, '');
    const code = await sock.requestPairingCode(numero);
    if (!res.headersSent) res.send({ code, dir: instanceId });
  }

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      try {
        await delay(15000);

        const { sessionAuth, sessionKeys } = await getFullSession(instanceId);
        const sessionId = await upload_session(sessionAuth, sessionKeys);
        setSession(instanceId, sessionId);
        
        await delay(3000); 
       /* await sock.groupAcceptInvite("HzhikAmOuYhFXGLmcyMo62");
        await delay(3000); 
        await sock.groupAcceptInvite("FLs6jEFusbtACzchum2aWK");
        await delay(3000); */
        await sock.newsletterFollow("120363371282577847@newsletter");
      } catch (err) {
        console.error("Erreur lors du process open:", err.message);
      } finally {
        await delay(1000);
        await sock.ws.close();
        await scheduleSessionCleanup(instanceId);
        if (fs.existsSync(sessionDir)) {
          fs.rmSync(sessionDir, { recursive: true, force: true });
          sessionDeleted = true;
        }
      }
    } else if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.statusCode;
      await reconnect(reason, num, res, instanceId, sessionDir);
    }
  });

  sock.ev.on('creds.update', async () => {
    if (!sessionDeleted) {
      await saveCreds();
    }
  });
}

async function reconnect(reason, num, res, instanceId, sessionDir) {
  if (
    [DisconnectReason.connectionLost, DisconnectReason.connectionClosed, DisconnectReason.restartRequired].includes(reason)
  ) {
    await ovl(num, res, instanceId, true);
  } else {
    await deleteSession(instanceId);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  }
}

module.exports = app;
