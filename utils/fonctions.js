const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes, Op } = require('sequelize');

const sessionMap = new Map();

const dbUrl =
  "postgresql://postgres:database@passWord1@db.slhhwogbunpkisjibhxy.supabase.co:5432/postgres";
const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  ssl: true,
  protocol: 'postgres',
  dialectOptions: {
    native: true,
    ssl: { require: true, rejectUnauthorized: false },
  },
  logging: false,
});

const Session = sequelize.define(
  'Session',
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    keys: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: 'sessions',
    timestamps: false,
  }
);

(async () => {
  await Session.sync();
  console.log("✅ Table 'Session' synchronisée.");
})();

let sessionCache = null;

function generateRandomId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

async function upload_session(creds, keys) {
  let rawId, fullId, exists;

  do {
    rawId = generateRandomId();
    fullId = `Ovl-MD_${rawId}_SESSION-ID`;
    exists = await Session.findByPk(fullId);
  } while (exists);

  await Session.create({
    id: fullId,
    content: JSON.stringify(creds),
    keys: JSON.stringify(keys),
    createdAt: new Date(),
  });

  if (sessionCache) {
    sessionCache[fullId] = {
      content: JSON.stringify(creds),
      keys: JSON.stringify(keys),
    };
  }

  return fullId;
}

async function get_session(id) {
  const session = await Session.findByPk(id);
  if (!session) return null;

  session.createdAt = new Date();
  await session.save();

  return {
    creds: session.content,
    keys: session.keys,
  };
}

async function delete_old_sessions() {
  const expired = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const count = await Session.destroy({
    where: {
      createdAt: { [Op.lt]: expired },
    },
  });

  console.log(`🧹 ${count} sessions supprimées (créées il y a plus de 3 jours)`);
}

setInterval(delete_old_sessions, 6 * 60 * 60 * 1000);

function setSession(dir, sessionId) {
  sessionMap.set(dir, sessionId);
}

function getSession(dir) {
  return sessionMap.get(dir);
}

function deleteSession(dir) {
  sessionMap.delete(dir);
}

function scheduleSessionCleanup(dir, delayMs = 120000) {
  setTimeout(() => {
    sessionMap.delete(dir);
  }, delayMs);
}

async function getFullSession(instanceId) {
  const sessionDir = path.join(__dirname, '../auth', instanceId);

  if (!fs.existsSync(sessionDir)) {
    throw new Error(`⚠️ Dossier de session introuvable : ${sessionDir}`);
  }

  let sessionAuth = {};
  let sessionKeys = {};

  const files = fs.readdirSync(sessionDir);

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const filePath = path.join(sessionDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (file === 'creds.json') {
      sessionAuth = content;
    } else {
      const name = file.replace('.json', '');
      if (!name.startsWith("pre-key-") && !name.startsWith("session-")) {
        sessionKeys[name] = content;
      }
    }
  }

  return { sessionAuth, sessionKeys };
}

async function get_all_sessions() {
  try {
    if (sessionCache) return sessionCache;

    const sessions = await Session.findAll({
      attributes: ['id', 'content', 'keys'],
    });

    const result = {};
    sessions.forEach((session) => {
      result[session.id] = {
        content: session.content,
        keys: session.keys,
      };
    });

    sessionCache = result;
    return result;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des sessions :', error);
    return null;
  }
}

module.exports = {
  upload_session,
  get_session,
  setSession,
  getSession,
  deleteSession,
  scheduleSessionCleanup,
  getFullSession,
  get_all_sessions
};
