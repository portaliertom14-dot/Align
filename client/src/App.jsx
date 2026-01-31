import { Routes, Route } from 'react-router-dom';
import IntroQuestionScreen from './components/onboarding/IntroQuestionScreen';
import PreQuestionsScreen from './components/onboarding/PreQuestionsScreen';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<IntroQuestionScreen />} />
      <Route path="/pre-questions" element={<PreQuestionsScreen />} />
    </Routes>
  );
}
