/**
 * Système de gestion des chapitres avec Supabase
 * Gère le déblocage progressif, la navigation et la persistance
 */

import { supabase } from '../../services/supabase';
import { getCurrentUser } from '../../services/auth';

/**
 * Récupère tous les chapitres avec leur statut de déverrouillage
 */
export async function getAllChapters() {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .order('index', { ascending: true });

    if (error) {
      if (__DEV__) console.log('[CHAPTERS_QUERY_ERR]', { table: 'chapters', code: error.code, message: error.message });
      throw error;
    }

    // Récupérer la progression de l'utilisateur pour déterminer les chapitres déverrouillés
    const user = await getCurrentUser();
    if (!user?.id) {
      if (__DEV__) console.log('[CHAPTERS_QUERY_OK]', { source: 'chapters', count: data?.length ?? 0 });
      return (data || []).map(ch => ({
        ...ch,
        isUnlocked: ch.index === 1,
      }));
    }

    const { data: progress, error: progressError } = await supabase
      .from('user_chapter_progress')
      .select('unlocked_chapters')
      .eq('id', user.id)
      .maybeSingle();

    if (progressError) {
      if (__DEV__) console.log('[CHAPTERS_QUERY_ERR]', { table: 'user_chapter_progress', code: progressError.code, message: progressError.message });
    }

    const unlockedChapters = progress?.unlocked_chapters || [1];

    if (__DEV__) console.log('[CHAPTERS_QUERY_OK]', { source: 'getAllChapters', chaptersCount: data?.length ?? 0 });
    return (data || []).map(ch => ({
      ...ch,
      isUnlocked: unlockedChapters.includes(ch.index),
    }));
  } catch (error) {
    console.error('[ChapterSystem] Erreur récupération chapitres:', error);
    if (__DEV__) console.log('[CHAPTERS_QUERY_ERR]', { code: error?.code, message: error?.message });
    return [];
  }
}

/**
 * Retourne un id valide pour current_chapter_id (FK). Vérifie que l'id existe dans chapters avant d'écrire.
 * Si aucun id valide trouvé, retourne null : l'appelant ne doit pas mettre à jour current_chapter_id (préserve la progression).
 */
async function ensureChapterIdExists(idCandidate, fallbackId) {
  if (idCandidate != null) {
    const row = await getChapterById(idCandidate);
    if (row) return idCandidate;
  }
  if (fallbackId != null) {
    const row = await getChapterById(fallbackId);
    if (row) return fallbackId;
  }
  return null;
}

/**
 * Récupère l'id (PK) du chapitre par son index (1-10).
 * À utiliser pour toute écriture dans user_chapter_progress.current_chapter_id (FK vers chapters.id).
 */
export async function getChapterIdByIndex(chapterIndex) {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select('id')
      .eq('index', chapterIndex)
      .maybeSingle();

    if (error) throw error;
    return data?.id ?? null;
  } catch (error) {
    console.error('[ChapterSystem] Erreur getChapterIdByIndex:', error);
    return null;
  }
}

/**
 * Récupère un chapitre par son index
 */
export async function getChapterByIndex(chapterIndex) {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('index', chapterIndex)
      .maybeSingle();

    if (error) {
      if (__DEV__) console.log('[CHAPTERS_QUERY_ERR]', { table: 'chapters', filter: 'index', code: error.code, message: error.message });
      return null;
    }
    return data ?? null;
  } catch (error) {
    console.error('[ChapterSystem] Erreur récupération chapitre:', error);
    return null;
  }
}

/**
 * Récupère un chapitre par son ID Supabase
 */
export async function getChapterById(chapterId) {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .maybeSingle();

    if (error) {
      if (__DEV__) console.log('[CHAPTERS_QUERY_ERR]', { table: 'chapters', filter: 'id', code: error.code, message: error.message });
      return null;
    }
    return data ?? null;
  } catch (error) {
    console.error('[ChapterSystem] Erreur récupération chapitre:', error);
    return null;
  }
}

/**
 * Récupère les modules d'un chapitre
 */
export async function getModulesByChapter(chapterId) {
  try {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[ChapterSystem] Erreur récupération modules:', error);
    return [];
  }
}

/**
 * Récupère les questions d'un module
 */
export async function getQuestionsByModule(moduleId) {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('module_id', moduleId)
      .order('order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[ChapterSystem] Erreur récupération questions:', error);
    return [];
  }
}

/**
 * Récupère la progression de l'utilisateur actuel
 */
export async function getUserChapterProgress() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return {
        currentChapterId: 1,
        currentModuleOrder: 1,
        completedModules: [],
        unlockedChapters: [1],
      };
    }

    const { data, error } = await supabase
      .from('user_chapter_progress')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      if (__DEV__) console.log('[CHAPTERS_QUERY_ERR]', { table: 'user_chapter_progress', fn: 'getUserChapterProgress', code: error.code, message: error.message });
      throw error;
    }

    if (!data) {
      return await initializeUserProgress(user.id);
    }

    return {
      currentChapterId: data.current_chapter_id || 1,
      currentModuleOrder: data.current_module_order || 1,
      completedModules: data.completed_modules || [],
      unlockedChapters: data.unlocked_chapters || [1],
    };
  } catch (error) {
    console.error('[ChapterSystem] Erreur récupération progression:', error);
    return {
      currentChapterId: 1,
      currentModuleOrder: 1,
      completedModules: [],
      unlockedChapters: [1],
    };
  }
}

/**
 * Initialise la progression d'un nouvel utilisateur
 */
async function initializeUserProgress(userId) {
  try {
    const firstChapterId = await getChapterIdByIndex(1);
    const payload = {
      id: userId,
      current_module_order: 1,
      completed_modules: [],
      unlocked_chapters: [1],
    };
    if (firstChapterId != null) {
      payload.current_chapter_id = firstChapterId;
    }

    const { data, error } = await supabase
      .from('user_chapter_progress')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      currentChapterId: data.current_chapter_id ?? firstChapterId ?? 1,
      currentModuleOrder: 1,
      completedModules: [],
      unlockedChapters: [1],
    };
  } catch (error) {
    console.error('[ChapterSystem] Erreur initialisation progression:', error);
    return {
      currentChapterId: 1,
      currentModuleOrder: 1,
      completedModules: [],
      unlockedChapters: [1],
    };
  }
}

/**
 * Vérifie si un chapitre est déverrouillé
 */
export async function isChapterUnlocked(chapterIndex) {
  try {
    const progress = await getUserChapterProgress();
    return progress.unlockedChapters.includes(chapterIndex);
  } catch (error) {
    console.error('[ChapterSystem] Erreur vérification déblocage:', error);
    return chapterIndex === 1; // Seul le chapitre 1 est déverrouillé par défaut
  }
}

/**
 * Vérifie si un module est accessible
 * Un module est accessible si :
 * - Son chapitre est déverrouillé
 * - Le module précédent (order - 1) est complété OU c'est le module 1
 */
export async function isModuleAccessible(chapterId, moduleOrder) {
  try {
    // Vérifier que le chapitre est déverrouillé
    const chapter = await getChapterById(chapterId);
    
    if (!chapter || !(await isChapterUnlocked(chapter.index))) {
      return false;
    }

    // Module 1 est toujours accessible si le chapitre est déverrouillé
    if (moduleOrder === 1) {
      return true;
    }

    // Vérifier que le module précédent est complété
    const progress = await getUserChapterProgress();
    const previousModuleCompleted = progress.completedModules.some(
      m => m.chapter_id === chapterId && m.module_order === moduleOrder - 1
    );

    return previousModuleCompleted;
  } catch (error) {
    console.error('[ChapterSystem] Erreur vérification accessibilité module:', error);
    return false;
  }
}

/**
 * Marque un module comme complété
 * Si c'est le module 3, déverrouille le chapitre suivant
 */
export async function completeModule(chapterId, moduleOrder) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      throw new Error('Utilisateur non connecté');
    }

    // Résoudre le chapitre : l'app peut passer l'index (1-10) ou l'id DB ; current_chapter_id doit être un chapters.id
    const chapter = await getChapterById(chapterId) || await getChapterByIndex(chapterId);
    if (!chapter) {
      console.warn('[ChapterSystem] completeModule: chapitre introuvable pour', chapterId);
      return { success: false, error: 'Chapitre introuvable' };
    }
    const chapterDbId = chapter.id;

    // Récupérer la progression actuelle
    const progress = await getUserChapterProgress();

    // Ajouter le module aux modules complétés (on stocke l'id DB pour cohérence)
    const completedModules = [...(progress.completedModules || [])];
    const moduleEntry = {
      chapter_id: chapterDbId,
      module_order: moduleOrder,
      completed_at: new Date().toISOString(),
    };

    // Vérifier si déjà complété
    const alreadyCompleted = completedModules.some(
      m => m.chapter_id === chapterDbId && m.module_order === moduleOrder
    );

    if (!alreadyCompleted) {
      completedModules.push(moduleEntry);
    }

    // Déterminer le prochain module (toujours un chapters.id valide pour la FK)
    let nextChapterId = progress.currentChapterId ?? chapterDbId;
    let nextModuleOrder = moduleOrder + 1;

    // Si c'est le module 3, passer au chapitre suivant ou nouveau cycle (chapitre 10 terminé)
    if (moduleOrder === 3) {
      if (chapter.index < 10) {
        nextChapterId = (await getChapterIdByIndex(chapter.index + 1)) ?? chapterDbId;
        nextModuleOrder = 1;
        nextChapterId = await ensureChapterIdExists(nextChapterId, chapterDbId);

        const unlockedChapters = [...(progress.unlockedChapters || [1])];
        const nextChapterIndex = chapter.index + 1;
        if (!unlockedChapters.includes(nextChapterIndex)) {
          unlockedChapters.push(nextChapterIndex);
        }
        const payload = { id: user.id, current_module_order: nextModuleOrder, completed_modules: completedModules, unlocked_chapters: unlockedChapters };
        if (nextChapterId != null) payload.current_chapter_id = nextChapterId;
        const { error: updateError } = await supabase
          .from('user_chapter_progress')
          .upsert(payload, { onConflict: 'id' });

        if (updateError) {
          throw updateError;
        }
        return {
          success: true,
          chapterCompleted: true,
          nextChapterId,
          nextModuleOrder,
          unlockedChapters,
        };
      }

      // Chapitre 10 terminé : nouveau cycle (retour chapitre 1). Pas de "chapitre final" — parcours continu.
      if (chapter.index === 10) {
        const firstChapterId = await getChapterIdByIndex(1);
        nextChapterId = await ensureChapterIdExists(firstChapterId ?? chapterDbId, chapterDbId);
        nextModuleOrder = 1;
        const unlockedChapters = progress.unlockedChapters || [1];
        const payloadCh10 = { id: user.id, current_module_order: nextModuleOrder, completed_modules: completedModules, unlocked_chapters: unlockedChapters };
        if (nextChapterId != null) payloadCh10.current_chapter_id = nextChapterId;
        const { error: updateError } = await supabase
          .from('user_chapter_progress')
          .upsert(payloadCh10, { onConflict: 'id' });
        if (updateError) {
          throw updateError;
        }
        return {
          success: true,
          chapterCompleted: true,
          nextChapterId,
          nextModuleOrder,
          unlockedChapters,
        };
      }
    }

    // Sinon, passer au module suivant dans le même chapitre (rester sur le même chapitre = même id)
    nextChapterId = await ensureChapterIdExists(chapterDbId, chapterDbId);
    const payloadSame = { id: user.id, current_module_order: nextModuleOrder, completed_modules: completedModules, unlocked_chapters: progress.unlockedChapters };
    if (nextChapterId != null) payloadSame.current_chapter_id = nextChapterId;
    const { error: updateError } = await supabase
      .from('user_chapter_progress')
      .upsert(payloadSame, { onConflict: 'id' });

    if (updateError) {
      throw updateError;
    }

    return {
      success: true,
      chapterCompleted: false,
      nextChapterId,
      nextModuleOrder,
      unlockedChapters: progress.unlockedChapters,
    };
  } catch (error) {
    console.error('[ChapterSystem] Erreur complétion module:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Récupère le statut de déblocage de tous les modules d'un chapitre
 */
export async function getModuleUnlockStatus(chapterId) {
  try {
    const modules = await getModulesByChapter(chapterId);
    const progress = await getUserChapterProgress();

    return modules.map(module => {
      const isCompleted = progress.completedModules.some(
        m => m.chapter_id === chapterId && m.module_order === module.order
      );
      
      const isAccessible = module.order === 1 || 
        progress.completedModules.some(
          m => m.chapter_id === chapterId && m.module_order === module.order - 1
        );

      return {
        ...module,
        isCompleted,
        isAccessible,
        isLocked: !isAccessible,
      };
    });
  } catch (error) {
    console.error('[ChapterSystem] Erreur statut déblocage:', error);
    return [];
  }
}
