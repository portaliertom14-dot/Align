/**
 * Stockage local des réponses checkpoints (préparé pour intégration IA plus tard).
 * checkpoint1: [answerQ1, answerQ2, answerQ3]
 * checkpoint2: [answerQ1, answerQ2, answerQ3]
 * checkpoint3: [answerQ1, answerQ2, answerQ3]
 */
let checkpointAnswers = {
  checkpoint1: [],
  checkpoint2: [],
  checkpoint3: [],
};

export function getCheckpointAnswers() {
  return { ...checkpointAnswers };
}

export function saveCheckpointAnswer(checkpointId, questionIndex, answer) {
  if (!checkpointAnswers[checkpointId]) {
    checkpointAnswers[checkpointId] = [];
  }
  checkpointAnswers[checkpointId][questionIndex] = answer;
}

export function getCheckpointAnswer(checkpointId, questionIndex) {
  return checkpointAnswers[checkpointId]?.[questionIndex] ?? null;
}
