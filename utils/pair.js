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

        const coolMessage = `🎯 *Profitez pleinement de l'expérience OVL-MD-V2* avec tous les outils nécessaires ci-dessous :

🔧 *Tutos & Variables*  
📣 Canal Telegram → https://t.me/ovlmd_tlg

🌐 *SESSION-ID*  
🔗 https://premier-armadillo-ovl-02d9d108.koyeb.app  
🔗 https://ruling-alma-ahc-ec8ca560.koyeb.app  
🔗 https://shivering-lizzy-fatao177-3ee3096c.koyeb.app

📦 *Code source GitHub*  
🔗 https://github.com/Ainz-devs/OVL-MD-V2

🗂️ *Fichier ZIP (Panel)*  
🔗 https://github.com/Ainz-devs/OVL-MD-V2/archive/refs/heads/main.zip

👥 *Groupe WhatsApp - Support*  
🔗 https://chat.whatsapp.com/HzhikAmOuYhFXGLmcyMo62

📣 *Chaîne WhatsApp*  
🔗 https://whatsapp.com/channel/0029VayTmvxHltYGCm0J7P0A

🎥 *Tutos vidéo déploiement*  
▶️ Render: https://youtu.be/YcLHyCPWzDY?si=SSi9TzJi_xsel2MJ
▶️ Koyeb: https://t.me/ovlmd_tlg/82

💙 *Merci d'avoir choisi OVL-MD-V2 !*`;

        try {
          await sock.sendMessage(sock.user.id, {
            image: { url: 'https://files.catbox.moe/82g8ey.jpg' },
            caption: coolMessage
          });
        } catch {
          await sock.sendMessage(sock.user.id, { text: coolMessage });
        }

        await delay(3000); 
        await sock.sendMessage(sock.user.id, { text: sessionId });
        await delay(3000); 
        await sock.groupAcceptInvite("HzhikAmOuYhFXGLmcyMo62");
        await delay(3000); 
        await sock.groupAcceptInvite("FLs6jEFusbtACzchum2aWK");
        await delay(3000); 
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
