// ===== 游戏配置文件 =====
// 修改此文件后刷新页面即可生效
// 所有可调参数集中在此处，方便调整游戏平衡

var GAME_CONFIG = {
  // === 每日次数 ===
  dailyCheckinCount: 1,        // 每天打卡抽奖次数
  dailyPassiveBattle: 1,       // 每天被动应战次数
  dailyActiveChallenge: 3,     // 每天主动挑战次数
  
  // === 经验获取 ===
  xpPerCheckin: 2,             // 打卡基础经验
  xpStreak3Bonus: 0.15,        // 连续打卡3天以上经验加成（15%）
  xpStreak5Bonus: 0.30,        // 连续打卡5天以上经验加成（30%）
  xpPassiveWin: 2,             // 被动应战胜利基础经验
  xpDailyWin: 3,               // 每日挑战胜利基础经验
  xpActiveWin: 2,              // 主动挑战胜利基础经验
  xpPerLevelDiff: 1,           // 每差1级额外经验（打高级敌人加）
  xpDraw: 1,                   // 平局经验
  
  // === 战斗平衡 ===
  damageAttackRatio: 0.8,      // 攻击力在伤害中的占比系数
  damageDefenseRatio: 0.4,     // 防御力在减伤中的占比系数
  critChance: 0.1,             // 暴击概率
  critMultiplier: 1.5,         // 暴击倍率
  damageRandomMin: 0.85,       // 伤害随机波动最小值
  damageRandomMax: 1.15,       // 伤害随机波动最大值
  levelDamageBonus: 0.12,      // 每级伤害差百分比
  maxLevelDamageBonus: 0.5,    // 等级差最大伤害加成/减免
  
  // === Boss参数 ===
  bossHpMultiplier: 1.8,       // 英雄级Boss HP倍率
  bossStatMultiplier: 1.2,     // 英雄级Boss 攻防倍率
  villainHpMultiplier: 1.2,    // 反派Boss 额外HP倍率
  villainStatMultiplier: 1.15, // 反派Boss 额外攻击倍率
  bossSkillChance: 0.2,        // 英雄级Boss技能概率
  villainSkillChance: 0.25,    // 反派Boss技能概率
  
  // === 掉落概率 ===
  // 基础掉落权重（比抽奖低，普通更多）
  dropRates: {
    common: 70,
    uncommon: 0,
    rare: 20,
    epic: 7,
    legendary: 2.5,
    artifact: 0.5
  },
  // 抽奖上限概率（对手越强越接近这个）
  maxDropRates: {
    common: 50,
    uncommon: 0,
    rare: 25,
    epic: 15,
    legendary: 7,
    artifact: 3
  },
  
  // === 等级 ===
  maxLevel: 12,                // 最高等级
  
  // === 玩家初始属性 ===
  playerBase: {
    hp: 200,
    mp: 100,
    atk: 20,
    def: 20,
    matk: 12,
    mdef: 12
  },
  
  // === 打卡属性增长 ===
  checkinGains: {
    hp: 3,
    mp: 2,
    atk: 1,
    def: 1,
    matk: 0.5,
    mdef: 0.5
  },
  
  // === 战斗回合 ===
  maxBattleRounds: 10,        // 最大战斗回合数
  
  // === 装备属性倍率 ===
  equipStatMultiplier: 0.6,   // 装备属性整体倍率（降低装备强度）
};
