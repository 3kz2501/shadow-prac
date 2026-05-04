import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ImportPage } from "./pages/ImportPage";
import { SessionList } from "./pages/SessionList";
import { SessionDetail } from "./pages/SessionDetail";
import { PracticePage } from "./pages/PracticePage";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <a href="/" className="app-logo">ShadowPrac</a>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<SessionList />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/sessions/:id" element={<SessionDetail />} />
            <Route path="/practice/:sessionId" element={<PracticePage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
