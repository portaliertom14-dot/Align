/**
 * Modèle de données pour les quêtes V2
 * Modèle générique et extensible
 */

/**
 * Statuts possibles d'une quête
 */
export const QUEST_STATUS = {
  ACTIVE: 'active',           // Quête active, en cours
  COMPLETED: 'completed',     // Quête complétée
};

/**
 * Types de quêtes (correspondent aux types d'événements)
 */
export const QUEST_TYPES = {
  STAR_EARNED: 'star_earned',
  LESSON_COMPLETED: 'lesson_completed',
  MODULE_COMPLETED: 'module_completed',
  LEVEL_REACHED: 'level_reached',
  TIME_SPENT: 'time_spent',
  PERFECT_SERIES: 'perfect_series',
};

/**
 * Classe représentant une quête
 */
export class Quest {
  constructor(data) {
    this.id = data.id || `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = data.type; // Type de quête (STAR_EARNED, LESSON_COMPLETED, etc.)
    this.title = data.title;
    this.description = data.description;
    this.target = data.target; // Objectif numérique
    this.progress = data.progress || 0; // Progression actuelle
    this.status = data.status || QUEST_STATUS.ACTIVE;
    this.sectionId = data.sectionId; // ID de la section à laquelle appartient la quête
    this.rewards = data.rewards || { stars: 0, xp: 0 }; // Récompenses
    this.createdAt = data.createdAt || new Date().toISOString();
    this.completedAt = data.completedAt || null;
    this.metadata = data.metadata || {}; // Données supplémentaires (ex: moduleId, level, etc.)
  }

  /**
   * Vérifie si la quête est complétée
   */
  isCompleted() {
    return this.status === QUEST_STATUS.COMPLETED || this.progress >= this.target;
  }

  /**
   * Met à jour la progression
   * @param {number} amount - Montant à ajouter
   * @returns {boolean} true si la quête vient d'être complétée
   */
  updateProgress(amount) {
    if (this.isCompleted()) {
      return false; // Quête déjà complétée, ne pas mettre à jour
    }

    const previousProgress = this.progress;
    this.progress = Math.min(this.progress + amount, this.target);

    // Vérifier si la quête vient d'être complétée
    const wasCompleted = this.isCompleted();
    if (wasCompleted && previousProgress < this.target) {
      this.status = QUEST_STATUS.COMPLETED;
      this.completedAt = new Date().toISOString();
      return true; // Nouvellement complétée
    }

    return false;
  }

  /**
   * Convertit la quête en objet JSON pour la sauvegarde
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      description: this.description,
      target: this.target,
      progress: this.progress,
      status: this.status,
      sectionId: this.sectionId,
      rewards: this.rewards,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
      metadata: this.metadata,
    };
  }

  /**
   * Crée une quête depuis un objet JSON
   */
  static fromJSON(data) {
    return new Quest(data);
  }
}

/**
 * Classe représentant une section de quêtes
 */
export class QuestSection {
  constructor(data) {
    this.id = data.id || `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.title = data.title; // Ex: "Quêtes hebdomadaires", "Quêtes mensuelles"
    this.type = data.type; // 'weekly' ou 'monthly'
    this.quests = (data.quests || []).map(q => Quest.fromJSON(q));
    this.createdAt = data.createdAt || new Date().toISOString();
    this.completedAt = data.completedAt || null;
  }

  /**
   * Vérifie si la section est complétée (toutes les quêtes sont complétées)
   */
  isCompleted() {
    return this.quests.length > 0 && this.quests.every(q => q.isCompleted());
  }

  /**
   * Ajoute une quête à la section
   */
  addQuest(quest) {
    quest.sectionId = this.id;
    this.quests.push(quest);
  }

  /**
   * Retourne les quêtes actives
   */
  getActiveQuests() {
    return this.quests.filter(q => q.status === QUEST_STATUS.ACTIVE);
  }

  /**
   * Retourne les quêtes complétées
   */
  getCompletedQuests() {
    return this.quests.filter(q => q.isCompleted());
  }

  /**
   * Convertit la section en objet JSON pour la sauvegarde
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      type: this.type,
      quests: this.quests.map(q => q.toJSON()),
      createdAt: this.createdAt,
      completedAt: this.completedAt,
    };
  }

  /**
   * Crée une section depuis un objet JSON
   */
  static fromJSON(data) {
    return new QuestSection(data);
  }
}
