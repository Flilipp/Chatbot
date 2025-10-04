import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ImageGenerator from "./pages/ImageGenerator";
import VoiceChat from "./pages/VoiceChat";
import NotFound from "./pages/NotFound";
import TestPage from "./pages/TestPage"; // Dodany import

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/test" element={<TestPage />} /> {/* Dodana ścieżka testowa */}
      <Route path="/" element={<Index />} />
      <Route path="/image-generator" element={<ImageGenerator />} />
      <Route path="/voice-chat" element={<VoiceChat />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;