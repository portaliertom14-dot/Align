/**
 * Tests simples : getPromptsForFeedModule utilise bien "metier" (pas metierId) dans le prompt.
 */
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { getPromptsForFeedModule } from './promptsFeedModule.ts';

Deno.test('mini_simulation_metier: prompt contient le metier passé', () => {
  const { userPrompt } = getPromptsForFeedModule(
    'mini_simulation_metier',
    'environnement_agri',
    'Chargé de mission environnement'
  );
  assertEquals(userPrompt.includes('Métier : Chargé de mission environnement'), true);
  assertEquals(userPrompt.includes('Secteur : environnement_agri'), true);
});

Deno.test('mini_simulation_metier: metier null => prompt sans metier', () => {
  const { userPrompt } = getPromptsForFeedModule('mini_simulation_metier', 'tech', null);
  assertEquals(userPrompt.includes('secteur tech'), true);
});

Deno.test('mini_simulation_metier: metierKey (slug) accepté dans le prompt', () => {
  const { userPrompt } = getPromptsForFeedModule(
    'mini_simulation_metier',
    'ingenierie_tech',
    'charge_de_mission_environnement'
  );
  assertEquals(userPrompt.includes('Métier : charge_de_mission_environnement'), true);
});
