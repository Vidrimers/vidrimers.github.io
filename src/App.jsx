import React, { useContext } from 'react';
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
  return (
    <LanguageProvider>
      <AdminProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/donate" element={<DonatePage />} />
        </Routes>
      </AdminProvider>
    </LanguageProvider>
  );
}

export default App;