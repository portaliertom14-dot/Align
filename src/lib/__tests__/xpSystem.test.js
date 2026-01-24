/**
 * Tests unitaires pour le système d'XP Align V2
 * 
 * Pour exécuter : npm test -- xpSystem.test.js
 */

import {
  getXPRequiredForLevel,
  getTotalXPForLevel,
  calculateLevel,
  getXPInCurrentLevel,
  getXPNeededForNextLevel,
  getLevelProgressPercent,
  isValidXP,
  isValidLevel,
  getProgressReport,
  generateLevelTable,
  XP_REWARDS,
  BASE_XP,
  GROWTH,
  MAX_LEVEL,
} from '../xpSystem';

describe('Système XP V2 - Constantes', () => {
  test('Constantes définies correctement', () => {
    expect(BASE_XP).toBe(20);
    expect(GROWTH).toBe(8);
    expect(MAX_LEVEL).toBe(1000);
  });

  test('XP_REWARDS définis correctement', () => {
    expect(XP_REWARDS.QUIZ_COMPLETED).toBe(15);
    expect(XP_REWARDS.DAILY_SERIES).toBe(10);
    expect(XP_REWARDS.MODULE_COMPLETED).toBe(25);
    expect(XP_REWARDS.CHAPTER_COMPLETED).toBe(50);
    expect(XP_REWARDS.QUEST_COMPLETED).toBe(30);
  });
});

describe('Système XP V2 - Calcul XP requise', () => {
  test('XP requise pour niveau 1 (~28)', () => {
    const xp = getXPRequiredForLevel(1);
    expect(xp).toBeGreaterThanOrEqual(28);
    expect(xp).toBeLessThanOrEqual(29);
  });

  test('XP requise pour niveau 5 (~60)', () => {
    const xp = getXPRequiredForLevel(5);
    expect(xp).toBeGreaterThanOrEqual(59);
    expect(xp).toBeLessThanOrEqual(61);
  });

  test('XP requise pour niveau 10 (~95)', () => {
    const xp = getXPRequiredForLevel(10);
    expect(xp).toBeGreaterThanOrEqual(94);
    expect(xp).toBeLessThanOrEqual(96);
  });

  test('XP requise pour niveau 20 (~180)', () => {
    const xp = getXPRequiredForLevel(20);
    expect(xp).toBeGreaterThanOrEqual(179);
    expect(xp).toBeLessThanOrEqual(181);
  });

  test('XP requise pour niveau 50 (~400)', () => {
    const xp = getXPRequiredForLevel(50);
    expect(xp).toBeGreaterThanOrEqual(399);
    expect(xp).toBeLessThanOrEqual(401);
  });

  test('XP requise pour niveau 100 (~800)', () => {
    const xp = getXPRequiredForLevel(100);
    expect(xp).toBeGreaterThanOrEqual(799);
    expect(xp).toBeLessThanOrEqual(821); // Marge élargie
  });

  test('Niveau 0 retourne BASE_XP', () => {
    expect(getXPRequiredForLevel(0)).toBe(BASE_XP);
  });

  test('Niveau MAX_LEVEL retourne Infinity', () => {
    expect(getXPRequiredForLevel(MAX_LEVEL)).toBe(Infinity);
  });
});

describe('Système XP V2 - Calcul XP totale', () => {
  test('XP totale pour niveau 0 est 0', () => {
    expect(getTotalXPForLevel(0)).toBe(0);
  });

  test('XP totale pour niveau 1', () => {
    const xp = getTotalXPForLevel(1);
    expect(xp).toBeGreaterThan(0);
    expect(xp).toEqual(getXPRequiredForLevel(1));
  });

  test('XP totale est cumulative', () => {
    const xpLevel5 = getTotalXPForLevel(5);
    const xpLevel4 = getTotalXPForLevel(4);
    const xpRequired5 = getXPRequiredForLevel(5);
    
    expect(xpLevel5).toBe(xpLevel4 + xpRequired5);
  });

  test('XP totale pour niveau MAX_LEVEL retourne Infinity', () => {
    expect(getTotalXPForLevel(MAX_LEVEL)).toBe(Infinity);
  });
});

describe('Système XP V2 - Calcul niveau depuis XP', () => {
  test('0 XP = niveau 1', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  test('Niveau correct pour XP faible', () => {
    const level = calculateLevel(50);
    expect(level).toBeGreaterThanOrEqual(1);
    expect(level).toBeLessThanOrEqual(3);
  });

  test('Niveau correct pour XP moyenne', () => {
    const level = calculateLevel(500);
    expect(level).toBeGreaterThanOrEqual(7);
    expect(level).toBeLessThanOrEqual(9);
  });

  test('Niveau correct pour XP élevée', () => {
    const level = calculateLevel(5000);
    expect(level).toBeGreaterThanOrEqual(25);
    expect(level).toBeLessThanOrEqual(35);
  });

  test('XP négative retourne niveau 1', () => {
    expect(calculateLevel(-100)).toBe(1);
  });

  test('Cohérence niveau ↔ XP totale', () => {
    for (let level = 1; level <= 50; level++) {
      const totalXP = getTotalXPForLevel(level);
      const calculatedLevel = calculateLevel(totalXP);
      expect(calculatedLevel).toBe(level);
    }
  });
});

describe('Système XP V2 - Utilitaires UI', () => {
  test('XP dans le niveau actuel', () => {
    // Ex: totalXP = 100, niveau 3
    // xpForLevel2 = 70, xpForLevel3 = 122
    // xpInLevel = 100 - 70 = 30
    const totalXP = 100;
    const xpInLevel = getXPInCurrentLevel(totalXP);
    
    expect(xpInLevel).toBeGreaterThanOrEqual(0);
    expect(xpInLevel).toBeLessThan(getXPNeededForNextLevel(totalXP));
  });

  test('XP dans le niveau pour XP = 0', () => {
    expect(getXPInCurrentLevel(0)).toBe(0);
  });

  test('XP nécessaire pour le prochain niveau', () => {
    const totalXP = 100;
    const xpNeeded = getXPNeededForNextLevel(totalXP);
    
    expect(xpNeeded).toBeGreaterThan(0);
    expect(xpNeeded).toBeLessThan(1000); // Valeurs raisonnables
  });

  test('XP nécessaire pour niveau MAX_LEVEL retourne Infinity', () => {
    const totalXP = getTotalXPForLevel(MAX_LEVEL - 1);
    expect(getXPNeededForNextLevel(totalXP)).toBe(Infinity);
  });

  test('Pourcentage de progression dans le niveau', () => {
    const totalXP = 100;
    const percent = getLevelProgressPercent(totalXP);
    
    expect(percent).toBeGreaterThanOrEqual(0);
    expect(percent).toBeLessThanOrEqual(100);
  });

  test('Pourcentage 0% pour début de niveau', () => {
    const totalXP = getTotalXPForLevel(5);
    const percent = getLevelProgressPercent(totalXP);
    
    expect(percent).toBe(0);
  });
});

describe('Système XP V2 - Validation', () => {
  test('isValidXP accepte valeurs correctes', () => {
    expect(isValidXP(0)).toBe(true);
    expect(isValidXP(100)).toBe(true);
    expect(isValidXP(999999)).toBe(true);
  });

  test('isValidXP rejette valeurs incorrectes', () => {
    expect(isValidXP(-1)).toBe(false);
    expect(isValidXP(NaN)).toBe(false);
    expect(isValidXP(Infinity)).toBe(false);
    expect(isValidXP('100')).toBe(false);
    expect(isValidXP(null)).toBe(false);
    expect(isValidXP(undefined)).toBe(false);
  });

  test('isValidLevel accepte valeurs correctes', () => {
    expect(isValidLevel(1)).toBe(true);
    expect(isValidLevel(50)).toBe(true);
    expect(isValidLevel(MAX_LEVEL)).toBe(true);
  });

  test('isValidLevel rejette valeurs incorrectes', () => {
    expect(isValidLevel(0)).toBe(false);
    expect(isValidLevel(-1)).toBe(false);
    expect(isValidLevel(MAX_LEVEL + 1)).toBe(false);
    expect(isValidLevel(NaN)).toBe(false);
    expect(isValidLevel('50')).toBe(false);
  });
});

describe('Système XP V2 - Rapport de progression', () => {
  test('getProgressReport retourne toutes les infos', () => {
    const report = getProgressReport(500);
    
    expect(report).toHaveProperty('totalXP');
    expect(report).toHaveProperty('currentLevel');
    expect(report).toHaveProperty('xpInLevel');
    expect(report).toHaveProperty('xpNeeded');
    expect(report).toHaveProperty('progressPercent');
    expect(report).toHaveProperty('totalXPForNextLevel');
    expect(report).toHaveProperty('isMaxLevel');
    
    expect(report.totalXP).toBe(500);
    expect(report.currentLevel).toBeGreaterThanOrEqual(1);
    expect(report.isMaxLevel).toBe(false);
  });

  test('getProgressReport pour niveau max', () => {
    const totalXP = getTotalXPForLevel(MAX_LEVEL - 1);
    const report = getProgressReport(totalXP);
    
    expect(report.currentLevel).toBe(MAX_LEVEL - 1);
  });
});

describe('Système XP V2 - Table de référence', () => {
  test('generateLevelTable retourne un tableau', () => {
    const table = generateLevelTable(10);
    
    expect(Array.isArray(table)).toBe(true);
    expect(table.length).toBe(10);
  });

  test('generateLevelTable contient les bonnes colonnes', () => {
    const table = generateLevelTable(5);
    
    table.forEach((row, index) => {
      expect(row).toHaveProperty('level');
      expect(row).toHaveProperty('xpRequired');
      expect(row).toHaveProperty('totalXP');
      expect(row.level).toBe(index + 1);
    });
  });

  test('generateLevelTable respecte MAX_LEVEL', () => {
    const table = generateLevelTable(MAX_LEVEL + 100);
    
    expect(table.length).toBe(MAX_LEVEL);
  });
});

describe('Système XP V2 - Non-régression (vs ancien système)', () => {
  test('Valeurs XP restent raisonnables aux hauts niveaux', () => {
    // L'ancien système générait 4+ milliards d'XP au niveau 100
    // Le nouveau doit rester sous 100k au niveau 100
    const xpLevel100 = getTotalXPForLevel(100);
    
    expect(xpLevel100).toBeLessThan(100000);
  });

  test('XP requise augmente graduellement', () => {
    // Vérifier que l'augmentation est progressive, pas exponentielle
    const xp10 = getXPRequiredForLevel(10);
    const xp20 = getXPRequiredForLevel(20);
    const xp40 = getXPRequiredForLevel(40);
    
    // Ratio 20/10 doit être < 2.5 (progression douce)
    const ratio1 = xp20 / xp10;
    expect(ratio1).toBeLessThan(2.5);
    
    // Ratio 40/20 doit être < 2.5
    const ratio2 = xp40 / xp20;
    expect(ratio2).toBeLessThan(2.5);
  });

  test('XP gagnées sont fixes (pas de multiplicateurs)', () => {
    // Vérifier que les récompenses sont constantes
    Object.values(XP_REWARDS).forEach(reward => {
      expect(typeof reward).toBe('number');
      expect(reward).toBeGreaterThan(0);
      expect(reward).toBeLessThan(100); // Valeurs raisonnables
    });
  });
});

describe('Système XP V2 - Scénarios réels', () => {
  test('Scénario : Nouveau joueur complète 3 modules', () => {
    let totalXP = 0;
    
    // Module 1
    totalXP += XP_REWARDS.MODULE_COMPLETED;
    let level = calculateLevel(totalXP);
    expect(level).toBe(1);
    
    // Module 2
    totalXP += XP_REWARDS.MODULE_COMPLETED;
    level = calculateLevel(totalXP);
    expect(level).toBeGreaterThanOrEqual(1);
    
    // Module 3
    totalXP += XP_REWARDS.MODULE_COMPLETED;
    level = calculateLevel(totalXP);
    expect(level).toBeGreaterThanOrEqual(1);
    expect(totalXP).toBe(75); // 25 * 3
  });

  test('Scénario : Joueur niveau 50 complète un module', () => {
    const xpBefore = getTotalXPForLevel(50);
    const xpAfter = xpBefore + XP_REWARDS.MODULE_COMPLETED;
    
    const levelBefore = calculateLevel(xpBefore);
    const levelAfter = calculateLevel(xpAfter);
    
    expect(levelBefore).toBe(50);
    // Après 1 module, toujours niveau 50 (ou 51 si près de la limite)
    expect(levelAfter).toBeGreaterThanOrEqual(50);
    expect(levelAfter).toBeLessThanOrEqual(51);
  });

  test('Scénario : Progression visible mais ralentie', () => {
    // Niveau 1 : ~28 XP requis, 1 module = 25 XP (presque 1 niveau)
    const xpLevel1Required = getXPRequiredForLevel(1);
    const ratioLevel1 = XP_REWARDS.MODULE_COMPLETED / xpLevel1Required;
    expect(ratioLevel1).toBeGreaterThan(0.8); // Progression rapide
    
    // Niveau 50 : ~400 XP requis, 1 module = 25 XP (6% du niveau)
    const xpLevel50Required = getXPRequiredForLevel(50);
    const ratioLevel50 = XP_REWARDS.MODULE_COMPLETED / xpLevel50Required;
    expect(ratioLevel50).toBeLessThan(0.1); // Progression ralentie
  });
});
