import React, { useContext } from 'react';
import { LanguageProvider, LanguageContext } from './context/LanguageContext';
import Header from './components/Layout/Header/Header';
import Footer from './components/Layout/Footer/Footer';
import ScrollToTop from './components/Layout/ScrollToTop/ScrollToTop';
import Hero from './components/Hero/Hero';
import About from './components/About/About';
import Skills from './components/Skills/Skills';
import Portfolio from './components/Portfolio/Portfolio';
import Certificates from './components/Certificates/Certificates';

// Внутренний компонент приложения
const AppContent = () => {
  const { translations } = useContext(LanguageContext);
  
  return (
    <div className="page">
      {/* Header с навигацией и переключателем языка */}
      <Header />
      
      {/* Hero Section */}
      <Hero />
      
      {/* About Section */}
      <About />
      
      {/* Skills Section */}
      <Skills />
      
      {/* Portfolio Section */}
      <Portfolio />
      
      {/* Certificates Section */}
      <Certificates />
      
      {/* Footer с контактами */}
      <Footer />
      
      {/* Кнопка "Вверх" */}
      <ScrollToTop />
    </div>
  );
};

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;