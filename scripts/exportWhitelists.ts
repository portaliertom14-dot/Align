/**
 * Exporte la whitelist métiers (source de vérité: src/data/jobsBySector.ts) vers:
 * - docs/WHITELISTS.md (format lisible)
 * - supabase/functions/_shared/jobsBySectorTitles.json (mêmes titres, même ordre)
 *
 * Usage: npm run export:whitelists (depuis la racine du projet)
 */

import * as fs from 'fs';
import * as path from 'path';
import { SECTOR_IDS, getJobsForSector, getJobsForSectorVariant } from '../src/data/jobsBySector';
import type { SectorId } from '../src/data/jobsBySector';

const projectRoot = path.resolve(__dirname, '..');

function run() {
  const outMd: string[] = [
    '# Whitelists métiers par secteur',
    '',
    'Source de vérité : `src/data/jobsBySector.ts`',
    `Généré le : ${new Date().toISOString().slice(0, 10)}`,
    '',
    '---',
    '',
  ];

  const jsonOut: Record<string, string[]> = {};

  for (const sectorId of SECTOR_IDS) {
    const listDefault = getJobsForSectorVariant(sectorId, 'default') ?? getJobsForSector(sectorId as SectorId);
    const list = listDefault;
    if (list.length !== 30) {
      throw new Error(`Secteur ${sectorId} doit avoir 30 métiers, trouvé: ${list.length}`);
    }
    jsonOut[sectorId] = [...list];
    outMd.push(`## ${sectorId}`);
    outMd.push('');
    list.forEach((title, i) => {
      outMd.push(`${i + 1}. ${title}`);
    });
    outMd.push('');
  }

  const docsDir = path.join(projectRoot, 'docs');
  const supabaseShared = path.join(projectRoot, 'supabase', 'functions', '_shared');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  if (!fs.existsSync(supabaseShared)) fs.mkdirSync(supabaseShared, { recursive: true });

  const mdPath = path.join(docsDir, 'WHITELISTS.md');
  fs.writeFileSync(mdPath, outMd.join('\n'), 'utf-8');
  console.log('Written:', mdPath);

  const jsonPath = path.join(supabaseShared, 'jobsBySectorTitles.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOut, null, 2), 'utf-8');
  console.log('Written:', jsonPath);
}

run();
