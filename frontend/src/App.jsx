import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MapPage from "./pages/MapPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="*" element={<MapPage />} />
      </Routes>
    </Router>
  );
}

export default App;
