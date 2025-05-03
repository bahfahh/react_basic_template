import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/Home/HomePage';
import { ChatPage } from './pages/Chat/ChatPage';
import { MainLayout } from './components/layout/MainLayout'; // Import the layout

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route without MainLayout (Homepage) */}
        <Route path="/" element={<HomePage />} />

        {/* Routes with the MainLayout (including SessionNavBar) */}
        <Route element={<MainLayout />}>
          <Route path="/chat" element={<ChatPage />} />
          {/* Add other routes that need the sidebar here */}
          {/* Example: <Route path="/dashboard" element={<DashboardPage />} /> */}
        </Route>

        {/* Other routes without the MainLayout (e.g., login) can go here */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
