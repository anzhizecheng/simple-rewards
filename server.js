// ============================================================
// 勇者征程 · 本地存档服务器（多角色版）
// 数据存在 save/ 目录下，每个角色一个存档文件
// ============================================================

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3789; // 勇者的谐音
const ROOT = __dirname;
const SAVE_DIR = path.join(ROOT, 'save');

// 确保 save 目录存在
if (!fs.existsSync(SAVE_DIR)) {
  fs.mkdirSync(SAVE_DIR, { recursive: true });
}

// 获取角色存档文件路径
function getSaveFile(charName) {
  return path.join(SAVE_DIR, `勇者征程-${charName}.json`);
}

// 获取角色存档列表文件
const META_FILE = path.join(SAVE_DIR, '_meta.json');

// 创建默认角色
function createDefaultPlayer(name) {
  return {
    name: name || "勇者",
    level: 1, xp: 0, streak: 0, totalChecks: 0,
    hp: 200, mp: 100,
    atk: 20, def: 20, matk: 12, mdef: 12,
    equipped: {
      weapons: [],
      armor: { head: null, body: null, shield: null },
      accessories: []
    },
    inventory: {},
    createdAt: new Date().toISOString().split('T')[0]
  };
}

// 创建初始角色（等级1，经验0，无预置装备）
function createXunPlayer() {
  const p = createDefaultPlayer("xun");
  p.growthLog = [];
  return p;
}

// 读取元数据（角色列表、当前角色）
function readMeta() {
  try {
    if (fs.existsSync(META_FILE)) {
      const data = fs.readFileSync(META_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('读取元数据失败:', e.message);
  }
  return null;
}

// 写入元数据
function writeMeta(meta) {
  try {
    fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('写入元数据失败:', e.message);
    return false;
  }
}

// 读取角色存档
function readChar(charName) {
  try {
    const file = getSaveFile(charName);
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error(`读取角色 ${charName} 存档失败:`, e.message);
  }
  return null;
}

// 写入角色存档
function writeChar(charName, playerData, extraData) {
  try {
    const file = getSaveFile(charName);
    const saveData = {
      version: 3,
      savedAt: new Date().toISOString(),
      player: playerData
    };
    // 保存额外数据（打卡日期、每日挑战、学习汇报等）
    if (extraData) {
      if (extraData.checkinDate !== undefined) saveData.checkinDate = extraData.checkinDate;
      if (extraData.growthLog !== undefined) saveData.growthLog = extraData.growthLog;
      if (extraData.dailyOpp !== undefined) saveData.dailyOpp = extraData.dailyOpp;
      if (extraData.passiveBattle !== undefined) saveData.passiveBattle = extraData.passiveBattle;
      if (extraData.lastStudyDate !== undefined) saveData.lastStudyDate = extraData.lastStudyDate;
      if (extraData.studyLogs !== undefined) saveData.studyLogs = extraData.studyLogs;
      if (extraData.activeChallengeDate !== undefined) saveData.activeChallengeDate = extraData.activeChallengeDate;
      if (extraData.activeChallengeCount !== undefined) saveData.activeChallengeCount = extraData.activeChallengeCount;
    }
    fs.writeFileSync(file, JSON.stringify(saveData, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error(`写入角色 ${charName} 存档失败:`, e.message);
    return false;
  }
}

// 获取所有角色列表
function getAllCharacters() {
  const meta = readMeta();
  if (meta && meta.characters) {
    return meta.characters;
  }
  return [];
}

// 更新角色列表元数据
function updateCharacterList(charName, playerData) {
  let meta = readMeta();
  if (!meta) {
    meta = { currentChar: charName, characters: [] };
  }
  const existing = meta.characters.find(c => c.name === charName);
  if (existing) {
    existing.level = playerData.level;
    existing.lastSave = new Date().toISOString();
  } else {
    meta.characters.push({
      name: charName,
      level: playerData.level,
      createdAt: playerData.createdAt,
      lastSave: new Date().toISOString()
    });
  }
  writeMeta(meta);
  return meta;
}

// 确保存档系统初始化
function ensureSaveSystem() {
  let meta = readMeta();
  let initialized = false;

  if (!meta) {
    meta = {
      version: 3,
      createdAt: new Date().toISOString().split('T')[0],
      currentChar: null,
      characters: []
    };
    initialized = true;
    writeMeta(meta);
  }

  return meta;
}

// 从旧版单文件存档迁移
function migrateFromOldSave() {
  const oldFile = path.join(ROOT, 'savegame.json');
  if (!fs.existsSync(oldFile)) return false;
  
  try {
    const oldData = JSON.parse(fs.readFileSync(oldFile, 'utf-8'));
    if (!oldData.characters || typeof oldData.characters !== 'object') return false;
    
    let migrated = 0;
    for (const [name, player] of Object.entries(oldData.characters)) {
      if (!readChar(name)) {
        writeChar(name, player);
        updateCharacterList(name, player);
        migrated++;
      }
    }
    
    // 更新当前角色
    const meta = readMeta();
    if (oldData.currentChar) {
      meta.currentChar = oldData.currentChar;
      writeMeta(meta);
    }
    
    console.log(`从旧版存档迁移了 ${migrated} 个角色`);
    return migrated > 0;
  } catch (e) {
    console.error('旧版存档迁移失败:', e.message);
    return false;
  }
}

// 导入备份存档
function importBackup(backupPath) {
  try {
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: "备份文件不存在" };
    }
    
    const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    let player = null;
    let charName = null;
    
    // 尝试从不同格式中提取角色数据
    if (data.player) {
      player = data.player;
      charName = player.name || "导入角色";
    } else if (data.characters) {
      // 新版格式（对象）
      if (typeof data.characters === 'object' && !Array.isArray(data.characters)) {
        const firstKey = Object.keys(data.characters)[0];
        if (firstKey) {
          player = data.characters[firstKey];
          charName = firstKey;
        }
      }
      // 旧版格式（数组）
      else if (Array.isArray(data.characters) && data.characters.length > 0) {
        charName = data.characters[0].name || "导入角色";
        // 数组格式只有角色基本信息，需要从 player 字段取详细数据
        if (data.player) {
          player = data.player;
        }
      }
    }
    
    if (!player || !charName) {
      return { success: false, error: "无法识别的存档格式" };
    }
    
    // 确保名字合法
    charName = charName.replace(/[^\w\u4e00-\u9fa5]/g, '_').substring(0, 12);
    if (!charName) charName = "导入角色";
    
    // 如果角色名已存在，加后缀
    let finalName = charName;
    let suffix = 1;
    while (readChar(finalName)) {
      finalName = `${charName}_${suffix}`;
      suffix++;
    }
    
    player.name = finalName;
    
    // 提取额外数据
    const extraData = {
      checkinDate: data.checkinDate || '',
      growthLog: data.growthLog || [],
      dailyOpp: data.dailyOpp || null,
      passiveBattle: data.passiveBattle || null,
      lastStudyDate: data.lastStudyDate || '',
      studyLogs: data.studyLogs || [],
      activeChallengeDate: data.activeChallengeDate || '',
      activeChallengeCount: data.activeChallengeCount || 0
    };
    
    writeChar(finalName, player, extraData);
    const meta = updateCharacterList(finalName, player);
    
    console.log(`导入存档成功: ${finalName}`);
    return { success: true, charName: finalName, meta };
  } catch (e) {
    console.error('导入备份失败:', e.message);
    return { success: false, error: e.message };
  }
}

// 获取当前角色数据（合并成旧格式兼容前端）
function getCharData(charName) {
  const char = readChar(charName);
  if (!char) return null;
  
  const player = char.player || char;
  const meta = readMeta();
  const allChars = meta ? meta.characters : [];
  
  return {
    version: 3,
    player: player,
    checkinDate: char.checkinDate || player.lastCheckin || '',
    growthLog: char.growthLog || player.growthLog || [],
    dailyOpp: char.dailyOpp || player.dailyOpp || null,
    passiveBattle: char.passiveBattle || player.passiveBattle || null,
    lastStudyDate: char.lastStudyDate || player.lastStudyDate || '',
    studyLogs: char.studyLogs || player.studyLogs || [],
    activeChallengeDate: char.activeChallengeDate || player.activeChallengeDate || '',
    activeChallengeCount: char.activeChallengeCount || player.activeChallengeCount || 0,
    characters: allChars,
    currentChar: charName
  };
}

// 保存角色数据
function saveCharData(charName, data) {
  if (data.player) {
    // 提取额外数据（非player字段）
    const extraData = {};
    if (data.checkinDate !== undefined) extraData.checkinDate = data.checkinDate;
    if (data.growthLog !== undefined) extraData.growthLog = data.growthLog;
    if (data.dailyOpp !== undefined) extraData.dailyOpp = data.dailyOpp;
    if (data.passiveBattle !== undefined) extraData.passiveBattle = data.passiveBattle;
    if (data.lastStudyDate !== undefined) extraData.lastStudyDate = data.lastStudyDate;
    if (data.studyLogs !== undefined) extraData.studyLogs = data.studyLogs;
    if (data.activeChallengeDate !== undefined) extraData.activeChallengeDate = data.activeChallengeDate;
    if (data.activeChallengeCount !== undefined) extraData.activeChallengeCount = data.activeChallengeCount;
    
    writeChar(charName, data.player, extraData);
    updateCharacterList(charName, data.player);
  }
  const meta = readMeta();
  if (meta) {
    if (data.currentChar) {
      meta.currentChar = data.currentChar;
      writeMeta(meta);
    }
  }
  return true;
}

// MIME 类型
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// 发送文件
function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

// 解析 POST body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// 创建 HTTP 服务器
const server = http.createServer(async (req, res) => {
  // 允许跨域（本地用）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);
  const charName = url.searchParams.get('char') || null;

  // ---- API 路由 ----

  // 获取完整存档（含所有角色列表）
  if (pathname === '/api/save' && req.method === 'GET') {
    ensureSaveSystem();
    migrateFromOldSave();
    const meta = readMeta();
    const current = meta ? meta.currentChar : null;

    // 没有角色时返回 noChar 信号，让前端弹出创建弹窗
    if (!current || !readChar(current)) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        player: null,
        characters: meta ? meta.characters : [],
        currentChar: null,
        noChar: true
      }));
      return;
    }

    const charData = getCharData(current);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(charData));
    return;
  }

  // 保存当前角色
  if (pathname === '/api/save' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      ensureSaveSystem();
      const targetChar = body.currentChar || charName;
      saveCharData(targetChar, body);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 切换角色
  if (pathname === '/api/switch' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const targetChar = body.name;
      ensureSaveSystem();
      
      if (!readChar(targetChar)) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: "角色不存在" }));
        return;
      }
      
      const meta = readMeta();
      meta.currentChar = targetChar;
      writeMeta(meta);
      
      const charData = getCharData(targetChar);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, save: charData }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 创建新角色
  if (pathname === '/api/create' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const name = body.name;
      if (!name || !/^[a-zA-Z0-9_\u4e00-\u9fa5]{1,12}$/.test(name)) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: "角色名不合法（1-12个字符）" }));
        return;
      }
      
      ensureSaveSystem();
      
      if (readChar(name)) {
        res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: "角色名已存在" }));
        return;
      }
      
      const newPlayer = createDefaultPlayer(name);
      const extraData = {
        checkinDate: '',
        growthLog: [],
        dailyOpp: null,
        passiveBattle: null,
        lastStudyDate: '',
        studyLogs: [],
        activeChallengeDate: '',
        activeChallengeCount: 0
      };
      writeChar(name, newPlayer, extraData);
      const meta = updateCharacterList(name, newPlayer);
      meta.currentChar = name;
      writeMeta(meta);
      
      const charData = getCharData(name);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, save: charData }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 删除角色
  if (pathname === '/api/delete' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const name = body.name;
      ensureSaveSystem();
      
      if (!readChar(name)) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: "角色不存在" }));
        return;
      }
      // 最后一名角色不可删除
      const metaBefore = readMeta();
      if (metaBefore && metaBefore.characters.length <= 1) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: "至少需要保留一个角色" }));
        return;
      }

      // 删除存档文件
      const saveFile = getSaveFile(name);
      if (fs.existsSync(saveFile)) {
        fs.unlinkSync(saveFile);
      }

      // 更新元数据
      const meta = readMeta();
      meta.characters = meta.characters.filter(c => c.name !== name);
      if (meta.currentChar === name) {
        meta.currentChar = meta.characters.length > 0 ? meta.characters[0].name : null;
      }
      writeMeta(meta);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, currentChar: meta.currentChar }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 重置当前角色
  if (pathname === '/api/reset' && req.method === 'POST') {
    ensureSaveSystem();
    const meta = readMeta();
    const char = meta.currentChar;
    
    let newPlayer = createDefaultPlayer(char);
    writeChar(char, newPlayer);
    updateCharacterList(char, newPlayer);
    
    const charData = getCharData(char);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, save: charData }));
    return;
  }

  // 导入备份存档
  if (pathname === '/api/import' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const backupPath = body.path;
      
      let result;
      if (backupPath && fs.existsSync(backupPath)) {
        result = importBackup(backupPath);
      } else {
        // 尝试从 save 目录导入所有备份
        const saveDir = SAVE_DIR;
        const files = fs.readdirSync(saveDir).filter(f => 
          f.startsWith('勇者征程-存档-') && f.endsWith('.json')
        );
        let imported = [];
        for (const file of files) {
          const r = importBackup(path.join(saveDir, file));
          if (r.success) imported.push(r.charName);
        }
        result = { success: imported.length > 0, imported: imported };
      }
      
      res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // 列出存档文件
  if (pathname === '/api/saves' && req.method === 'GET') {
    try {
      const files = fs.readdirSync(SAVE_DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'));
      const saves = files.map(f => {
        const fullPath = path.join(SAVE_DIR, f);
        const stat = fs.statSync(fullPath);
        return {
          filename: f,
          size: stat.size,
          modified: stat.mtime.toISOString()
        };
      }).sort((a, b) => new Date(b.modified) - new Date(a.modified));
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ saves }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // ---- 静态文件 ----
  let filePath;
  if (pathname === '/' || pathname === '') {
    filePath = path.join(ROOT, '勇者征程.html');
  } else {
    // 防止路径穿越
    const cleanPath = pathname.replace(/\.\./g, '');
    filePath = path.join(ROOT, cleanPath);
  }

  // 检查是否是目录下的文件
  if (filePath.startsWith(ROOT) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    sendFile(res, filePath);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

// 启动服务器
server.listen(PORT, () => {
  console.log('========================================');
  console.log('  ⚔️  勇者征程 · 本地存档服务器（多角色）');
  console.log('========================================');
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`  存档目录: ${SAVE_DIR}`);
  console.log(`  存档格式: save/勇者征程-{角色名}.json`);
  console.log(`  初始状态: 首次启动需创建角色`);
  console.log('  按 Ctrl+C 停止服务器');
  console.log('========================================');
  
  // 初始化存档系统
  ensureSaveSystem();
  // 尝试从旧版存档迁移
  migrateFromOldSave();
});
