/**
 * Script pour générer et afficher la table de référence du système XP V2
 * 
 * Usage : node scripts/generateXPTable.js [maxLevel]
 * Exemple : node scripts/generateXPTable.js 100
 */

// Importer directement les fonctions (sans transpilation)
const BASE_XP = 20;
const GROWTH = 8;
const MAX_LEVEL = 1000;

function getXPRequiredForLevel(level) {
  if (level <= 0) return BASE_XP;
  if (level >= MAX_LEVEL) return Infinity;
  
  const xpRequired = BASE_XP + GROWTH * Math.pow(level, 1.5);
  return Math.round(xpRequired);
}

function getTotalXPForLevel(targetLevel) {
  if (targetLevel <= 0) return 0;
  if (targetLevel >= MAX_LEVEL) return Infinity;
  
  let totalXP = 0;
  for (let level = 1; level <= targetLevel; level++) {
    totalXP += getXPRequiredForLevel(level);
  }
  return totalXP;
}

function generateLevelTable(maxLevelToShow = 100) {
  const table = [];
  
  for (let level = 1; level <= Math.min(maxLevelToShow, MAX_LEVEL); level++) {
    const xpRequired = getXPRequiredForLevel(level);
    const totalXP = getTotalXPForLevel(level);
    
    table.push({
      level,
      xpRequired,
      totalXP,
    });
  }
  
  return table;
}

// ============================================================================
// SCRIPT PRINCIPAL
// ============================================================================

const args = process.argv.slice(2);
const maxLevel = args[0] ? parseInt(args[0], 10) : 100;

if (isNaN(maxLevel) || maxLevel <= 0) {
  console.error('❌ Erreur : maxLevel doit être un nombre positif');
  console.log('Usage : node scripts/generateXPTable.js [maxLevel]');
  process.exit(1);
}

console.log('\n🎯 SYSTÈME XP ALIGN - TABLE DE RÉFÉRENCE V2\n');
console.log('═══════════════════════════════════════════════════\n');
console.log(`Formule : XP_required(level) = ${BASE_XP} + ${GROWTH} * (level ^ 1.5)\n`);

const table = generateLevelTable(Math.min(maxLevel, MAX_LEVEL));

// Afficher les jalons importants
const milestones = [1, 5, 10, 20, 30, 50, 75, 100];
console.log('📊 JALONS IMPORTANTS\n');
console.log('┌─────────┬─────────────┬──────────────┐');
console.log('│ Niveau  │ XP requise  │ XP totale    │');
console.log('├─────────┼─────────────┼──────────────┤');

milestones.forEach(level => {
  if (level <= table.length) {
    const row = table[level - 1];
    console.log(
      `│ ${String(row.level).padStart(7)} │ ${String(row.xpRequired).padStart(11)} │ ${String(row.totalXP).padStart(12)} │`
    );
  }
});

console.log('└─────────┴─────────────┴──────────────┘\n');

// Statistiques
console.log('📈 STATISTIQUES\n');
const lastLevel = table[table.length - 1];
console.log(`• Niveaux générés : ${table.length}`);
console.log(`• XP requise niveau 1 : ${table[0].xpRequired}`);
console.log(`• XP requise niveau ${lastLevel.level} : ${lastLevel.xpRequired}`);
console.log(`• XP totale niveau ${lastLevel.level} : ${lastLevel.totalXP}`);
console.log(`• Ratio niveau ${lastLevel.level} / niveau 1 : ${(lastLevel.xpRequired / table[0].xpRequired).toFixed(2)}x`);

// Comparaison avec l'ancien système
console.log('\n⚠️  COMPARAISON AVEC L\'ANCIEN SYSTÈME\n');
const oldSystemXPLevel100 = Math.floor(100 * Math.pow(1.05, 99)); // Ancien : BASE_XP * (1.05 ^ level)
let oldSystemTotal = 0;
for (let i = 0; i < 100; i++) {
  oldSystemTotal += Math.floor(100 * Math.pow(1.05, i));
}

console.log(`Ancien système (exponentiel) :`);
console.log(`  • XP requise niveau 100 : ${oldSystemXPLevel100.toLocaleString()}`);
console.log(`  • XP totale niveau 100 : ${oldSystemTotal.toLocaleString()}`);
console.log(`  • ❌ Problème : Croissance explosive (4+ milliards)\n`);

if (table.length >= 100) {
  const newSystemLevel100 = table[99];
  console.log(`Nouveau système (progressif) :`);
  console.log(`  • XP requise niveau 100 : ${newSystemLevel100.xpRequired.toLocaleString()}`);
  console.log(`  • XP totale niveau 100 : ${newSystemLevel100.totalXP.toLocaleString()}`);
  console.log(`  • ✅ Solution : Croissance douce et maîtrisée\n`);
  
  const reduction = (1 - (newSystemLevel100.totalXP / oldSystemTotal)) * 100;
  console.log(`🎉 Réduction de ${reduction.toFixed(1)}% de l'XP totale au niveau 100 !`);
}

// Analyse de progression
console.log('\n📊 ANALYSE DE PROGRESSION (Module = 25 XP)\n');
const moduleXP = 25;
const levelsToAnalyze = [1, 10, 20, 50, 100];

console.log('┌─────────┬─────────────┬────────────────────┬──────────────────┐');
console.log('│ Niveau  │ XP requise  │ Modules/niveau     │ Temps (h)*       │');
console.log('├─────────┼─────────────┼────────────────────┼──────────────────┤');

levelsToAnalyze.forEach(level => {
  if (level <= table.length) {
    const row = table[level - 1];
    const modulesPerLevel = (row.xpRequired / moduleXP).toFixed(1);
    const timePerModule = 5; // 5 minutes par module (estimation)
    const timeInHours = ((modulesPerLevel * timePerModule) / 60).toFixed(1);
    
    console.log(
      `│ ${String(level).padStart(7)} │ ${String(row.xpRequired).padStart(11)} │ ${String(modulesPerLevel).padStart(18)} │ ${String(timeInHours).padStart(16)} │`
    );
  }
});

console.log('└─────────┴─────────────┴────────────────────┴──────────────────┘');
console.log('* Estimation : 5 min/module\n');

// Export CSV si demandé
if (args.includes('--csv')) {
  const fs = require('fs');
  const csv = [
    'Niveau,XP requise,XP totale',
    ...table.map(row => `${row.level},${row.xpRequired},${row.totalXP}`)
  ].join('\n');
  
  const filename = `xp_table_level_${maxLevel}.csv`;
  fs.writeFileSync(filename, csv);
  console.log(`\n💾 Table exportée dans ${filename}`);
}

console.log('\n═══════════════════════════════════════════════════\n');
console.log('✅ Système XP V2 - Scalable, Lisible, Durable\n');
