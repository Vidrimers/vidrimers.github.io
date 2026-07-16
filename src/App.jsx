import React, { useContext, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LanguageProvider, LanguageContext } from './context/LanguageContext';
import { AdminProvider } from './components/Admin/AdminProvider';
import Header from './components/Layout/Header/Header';
import Footer from './components/Layout/Footer/Footer';
import ScrollToTop from './components/Layout/ScrollToTop/ScrollToTop';
import Hero from './components/Hero/Hero';
import About from './components/About/About';
import Skills from './components/Skills/Skills';
import Portfolio from './components/Portfolio/Portfolio';
import Certificates from './components/Certificates/Certificates';
import DonatePage from './pages/DonatePage/DonatePage';
import SettingsPage from './pages/SettingsPage/SettingsPage';
import PetGangAdmin from './pages/PetGang/PetGangAdmin';
import PetGangProfile from './pages/PetGang/PetGangProfile';
import PetGangPet from './pages/PetGang/PetGangPet';
import PetGangScan from './pages/PetGang/PetGangScan';
import { trackVisit } from './utils/tracking';

// Главная страница
const HomePage = () => {
  const { translations } = useContext(LanguageContext);

  return (
    <div className="page">
      <Header />
      <Hero />
      <About />
      <Skills />
      <Portfolio />
      <Certificates />
      <Footer />
      <ScrollToTop />
    </div>
  );
};

function App() {
  // Трекинг визита на каждой странице
  useEffect(() => { trackVisit(); }, []);

  return (
    <LanguageProvider>
      <AdminProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/donate" element={<DonatePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/pet-gang" element={<PetGangAdmin />} />
          <Route path="/pet-gang/profile" element={<PetGangProfile />} />
          <Route path="/pet-gang/pet/:id" element={<PetGangPet />} />
          <Route path="/pet-gang/scan/:token" element={<PetGangScan />} />
        </Routes>
      </AdminProvider>
    </LanguageProvider>
  );
}

export default App;