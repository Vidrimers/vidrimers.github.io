import { createContext, useState, useEffect } from 'react';
import ruTranslations from '../data/translations/ru.json';
import enTranslations from '../data/translations/en.json';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('ru');
  const [translations, setTranslations] = useState(ruTranslations);
  
  useEffect(() => {
    const savedLang = localStorage.getItem('language') || 'ru';
    setLanguage(savedLang);
    setTranslations(savedLang === 'ru' ? ruTranslations : enTranslations);
  }, []);
  
  const changeLanguage = (lang) => {
    setLanguage(lang);
    setTranslations(lang === 'ru' ? ruTranslations : enTranslations);
    localStorage.setItem('language', lang);
  };
  
  return (
    <LanguageContext.Provider value={{ language, translations, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};