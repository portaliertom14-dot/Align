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

    if (error) throw error;

    // Récupérer la progression de l'utilisateur pour déterminer les chapitres déverrouillés
    const user = await getCurrentUser();
    if (!user?.id) {
      // Pas d'utilisateur : seul le chapitre 1 est déverrouillé
      return data.map(ch => ({
        ...ch,
        isUnlocked: ch.index === 1,
      }));
    }

    const { data: progress } = await supabase
      .from('user_chapter_progress')
      .select('unlocked_chapters')
      .eq('id', user.id)
      .single();

    const unlockedChapters = progress?.unlocked_chapters || [1];

    return data.map(ch => ({
      ...ch,
      isUnlocked: unlockedChapters.includes(ch.index),
    }));
  } catch (error) {
    console.error('[ChapterSystem] Erreur récupération chapitres:', error);
    return [];
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
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
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
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
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
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

    if (!data) {
      // Créer une progression initiale
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
    const { data, error } = await supabase
      .from('user_chapter_progress')
      .insert({
        id: userId,
        current_chapter_id: 1,
        current_module_order: 1,
        completed_modules: [],
        unlocked_chapters: [1],
      })
      .select()
      .single();

    if (error) throw error;

    return {
      currentChapterId: 1,
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

    // Récupérer la progression actuelle
    const progress = await getUserChapterProgress();

    // Ajouter le module aux modules complétés
    const completedModules = [...(progress.completedModules || [])];
    const moduleEntry = {
      chapter_id: chapterId,
      module_order: moduleOrder,
      completed_at: new Date().toISOString(),
    };

    // Vérifier si déjà complété
    const alreadyCompleted = completedModules.some(
      m => m.chapter_id === chapterId && m.module_order === moduleOrder
    );

    if (!alreadyCompleted) {
      completedModules.push(moduleEntry);
    }

    // Déterminer le prochain module
    let nextChapterId = progress.currentChapterId;
    let nextModuleOrder = moduleOrder + 1;

    // Si c'est le module 3, passer au chapitre suivant
    if (moduleOrder === 3) {
      const chapter = await getChapterById(chapterId);
      
      if (chapter && chapter.index < 10) {
        const { data: nextChapter } = await supabase
          .from('chapters')
          .select('id')
          .eq('index', chapter.index + 1)
          .single();
        
        nextChapterId = nextChapter?.id || chapterId;
        
        nextModuleOrder = 1;

        // Déverrouiller le chapitre suivant
        const unlockedChapters = [...(progress.unlockedChapters || [1])];
        const nextChapterIndex = chapter.index + 1;
        
        if (!unlockedChapters.includes(nextChapterIndex)) {
          unlockedChapters.push(nextChapterIndex);
        }

        // Mettre à jour la progression
        const { error: updateError } = await supabase
          .from('user_chapter_progress')
          .upsert({
            id: user.id,
            current_chapter_id: nextChapterId,
            current_module_order: nextModuleOrder,
            completed_modules: completedModules,
            unlocked_chapters: unlockedChapters,
          }, {
            onConflict: 'id',
          });

        if (updateError) throw updateError;

        return {
          success: true,
          chapterCompleted: true,
          nextChapterId,
          nextModuleOrder,
          unlockedChapters,
        };
      }
    }

    // Sinon, passer au module suivant dans le même chapitre
    const { error: updateError } = await supabase
      .from('user_chapter_progress')
      .upsert({
        id: user.id,
        current_chapter_id: nextChapterId,
        current_module_order: nextModuleOrder,
        completed_modules: completedModules,
        unlocked_chapters: progress.unlockedChapters,
      }, {
        onConflict: 'id',
      });

    if (updateError) throw updateError;

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
