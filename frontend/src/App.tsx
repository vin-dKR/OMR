import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import InputPage from './components/InputPage';
import ResultsPage from './components/ResultsPage';
import type { OMRData } from './types/omr';

function App() {
  const [omrData, setOmrData] = useState<OMRData | null>(null);
  return (
    <Router>
      <div className="min-h-screen bg-eggshell">
        <Routes>
          <Route 
            path="/" 
            element={<InputPage />}
          />
          <Route 
            path="/results" 
            element={<ResultsPage 
              omrData={omrData || {
                answerKey: {
                  imageFile: new File([], ''),
                  answers: [],
                  processedAt: new Date()
                },
                studentResponses: [],
                sessionId: '',
                createdAt: new Date()
              }} 
              onBackToInput={() => setOmrData(null)}
            />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
