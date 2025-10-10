import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import Upload from "../pages/Upload";
import Results from "../pages/Results";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/jobs/:jobId" element={<Results />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
