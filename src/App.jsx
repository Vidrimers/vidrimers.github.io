import React, { useContext } from 'react';
import { LanguageProvider, LanguageContext } from './context/LanguageContext';
import Header from './components/Layout/Header/Header';
import Footer from './components/Layout/Footer/Footer';
import ScrollToTop from './components/Layout/ScrollToTop/ScrollToTop';
import Hero from './components/Hero/Hero';
import About from './components/About/About';
import Skills from './components/Skills/Skills';
// import Portfolio from './components/Portfolio/Portfolio';
// import Certificates from './components/Certificates/Certificates';

// Внутренний компонент для демонстрации работы LanguageContext
const AppContent = () => {
  const { language, translations, changeLanguage } = useContext(LanguageContext);
  
  return (
    <div className="page">
      {/* Header с навигацией и переключателем языка */}
      <Header />
      
      <div style={{ padding: '20px', borderBottom: '1px solid #ccc', marginBottom: '20px' }}>
        <h1>React Portfolio - В разработке</h1>
        <p>Добро пожаловать в новое React приложение!</p>
        
        {/* Демонстрация переключателя языка */}
        <div style={{ margin: '20px 0' }}>
          <strong>Текущий язык: {language}</strong>
          <div style={{ marginTop: '10px' }}>
            <button 
              onClick={() => changeLanguage('ru')}
              style={{ 
                marginRight: '10px', 
                padding: '5px 10px',
                backgroundColor: language === 'ru' ? '#007bff' : '#f8f9fa',
                color: language === 'ru' ? 'white' : 'black',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Русский
            </button>
            <button 
              onClick={() => changeLanguage('en')}
              style={{ 
                padding: '5px 10px',
                backgroundColor: language === 'en' ? '#007bff' : '#f8f9fa',
                color: language === 'en' ? 'white' : 'black',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              English
            </button>
          </div>
        </div>
      </div>
      
      {/* Hero Section */}
      <Hero />
      
      {/* About Section */}
      <About />
      
      {/* Временная структура для демонстрации с переводами */}
      <section id="home" style={{ minHeight: '100vh', padding: '50px 20px' }}>
        <h2>{translations.hero.title || 'Hero Section'}</h2>
        <p>{translations.hero.greeting}</p>
        <p>{translations.hero.subtitle}</p>
      </section>
      
      {/* Skills Section */}
      <Skills />
      
      <section id="portfolio" style={{ minHeight: '100vh', padding: '50px 20px', background: '#f5f5f5' }}>
        <h2>{translations.portfolio.title}</h2>
        <p>Категории: {translations.portfolio.tabs.pet} | {translations.portfolio.tabs.layout}</p>
      </section>
      
      <section id="certificates" style={{ minHeight: '100vh', padding: '50px 20px' }}>
        <h2>{translations.certificates.title}</h2>
        <p>Здесь будет компонент Certificates</p>
      </section>
      
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