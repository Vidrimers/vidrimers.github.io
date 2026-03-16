/**
 * Данные проектов портфолио
 */

export const portfolioProjects = [
  // Собственные проекты (pet)
  {
    id: 1,
    title: 'НПП Полет',
    titleEn: 'NPP Polet',
    description: 'Сайт сделан на основе оригинального, но устаревшего сайта, который был собран еще в табличной верстке',
    descriptionEn: 'The site is based on the original, but outdated site, which was assembled back in a tabular layout',
    image: '/assets/img/portfolio/npppolet.jpg',
    link: 'https://vidrimers.github.io/portfolio.npppolet/',
    category: 'pet',
    isAi: false,
    isNew: false,
    isInProgress: false
  },
  {
    id: 2,
    title: 'ЛФК "Креатив"',
    titleEn: 'FC "Creative"',
    description: 'Страница создана для любительского футбольного клуба "Креатив"',
    descriptionEn: 'Page created for the amateur soccer club "Creative"',
    image: '/assets/img/portfolio/creativ.jpg',
    link: 'https://vidrimers.github.io/portfolio.creativ/',
    category: 'pet',
    isAi: false,
    isNew: false,
    isInProgress: false
  },
  {
    id: 3,
    title: 'Страница колориста',
    titleEn: 'Colorist page',
    description: 'Страница с галереей работ колориста',
    descriptionEn: 'Page with a gallery of colorist work',
    image: '/assets/img/portfolio/darinacolor.jpg',
    link: 'https://vidrimers.github.io/portfolio.darina-color/',
    category: 'pet',
    isAi: false,
    isNew: false,
    isInProgress: false
  },
  
  // Учебные проекты (layout)
  {
    id: 4,
    title: 'Итоговая работа в AcademyTOP',
    titleEn: 'Final Project at AcademyTOP',
    description: 'Итоговая работа в AcademyTOP по экзамену "Разработка веб-страниц на языке разметки HTML5 с использованием каскадных таблиц стилей CSS3(FrontEnd)"',
    descriptionEn: 'Final Project at AcademyTOP for the exam "Web Page Development Using HTML5 Markup Language and CSS3 Style Sheets (FrontEnd)"',
    image: '/assets/img/portfolio/furniture.jpg',
    link: 'https://vidrimers.github.io/academy-top-html',
    category: 'layout',
    isAi: false,
    isNew: false,
    isInProgress: false
  },
  {
    id: 5,
    title: 'Mavic 2 Pro',
    titleEn: 'Mavic 2 Pro',
    description: 'Проект сайта для продажи квадрокоптера DJI Mavic 2 Pro, выполненный по макету из марафона "От 0 до 1" 2020 года',
    descriptionEn: 'Website project for selling DJI Mavic 2 Pro drone, made according to the layout from the "From 0 to 1" marathon 2020',
    image: '/assets/img/portfolio/mavic.jpg',
    link: 'https://vidrimers.github.io/portfolio.0to1__2020-marathon--mavic',
    category: 'layout',
    isAi: false,
    isNew: false,
    isInProgress: false
  }
];

/**
 * Получить проекты по категории
 */
export const getProjectsByCategory = (category) => {
  if (category === 'all') {
    return portfolioProjects;
  }
  return portfolioProjects.filter(project => project.category === category);
};

/**
 * Получить проект по ID
 */
export const getProjectById = (id) => {
  return portfolioProjects.find(project => project.id === id);
};
