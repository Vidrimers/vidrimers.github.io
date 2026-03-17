/**
 * Данные проектов портфолио
 */

export const portfolioProjects = [
  // Собственные проекты (pet)
   {
    id: 'pet-1',
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
  {
    id: 'pet-2',
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
    id: 'pet-3',
    title: 'НПП Полет',
    titleEn: 'NPP Polet',
    description: 'Сайт сделан на основе <a href="https://www.npppolet.ru/" target="_blank">оригинального</a>, но устаревшего сайта, который был собран еще в табличной верстке',
    descriptionEn: 'The site is based on the <a href="https://www.npppolet.ru/" target="_blank">original</a>, but outdated site, which was assembled back in a tabular layout',
    image: '/assets/img/portfolio/npppolet.jpg',
    link: 'https://vidrimers.github.io/portfolio.npppolet/',
    category: 'pet',
    isAi: false,
    isNew: false,
    isInProgress: false
  },
  
  // Учебные проекты (layout)
  {
    id: 'layout-1',
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
  },
  {
    id: 'layout-2',
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
  }
];

/**
 * Получить проекты по категории с сортировкой по убыванию ID
 * Новые проекты (с большими номерами) будут показываться первыми
 */
export const getProjectsByCategory = (category) => {
  let projects;
  
  if (category === 'all') {
    projects = [...portfolioProjects];
  } else {
    projects = portfolioProjects.filter(project => project.category === category);
  }
  
  // Сортируем по убыванию ID внутри каждой категории
  return projects.sort((a, b) => {
    // Извлекаем номер из ID (например, из 'pet-3' получаем 3)
    const getIdNumber = (id) => {
      const parts = id.split('-');
      return parseInt(parts[1]) || 0;
    };
    
    const aCategory = a.id.split('-')[0];
    const bCategory = b.id.split('-')[0];
    
    // Если категории разные, сортируем по категориям (pet первые, потом layout)
    if (aCategory !== bCategory) {
      if (aCategory === 'pet') return -1;
      if (bCategory === 'pet') return 1;
      return aCategory.localeCompare(bCategory);
    }
    
    // Если категории одинаковые, сортируем по убыванию номера ID
    return getIdNumber(b.id) - getIdNumber(a.id);
  });
};

/**
 * Получить проект по ID
 */
export const getProjectById = (id) => {
  return portfolioProjects.find(project => project.id === id);
};
