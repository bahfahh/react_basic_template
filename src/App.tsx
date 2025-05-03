import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/Home/HomePage';
import { ChatPage } from './pages/Chat/ChatPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
