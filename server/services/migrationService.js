/**
 * Сервис миграции данных из статических файлов в базу данных
 */

const DatabaseService = require('./databaseService');
const { runQuery, getOne, getAll, transaction } = require('./databaseService');

/**
 * Данные для миграции (копии из статических файлов)
 */

// Данные портфолио
const portfolioProjects = [
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

// Данные навыков
const skills = [
  {
    id: 1,
    name: 'Html',
    nameEn: 'Html',
    icon: '/assets/img/ico/skills/html.png'
  },
  {
    id: 2,
    name: 'Css',
    nameEn: 'Css',
    icon: '/assets/img/ico/skills/css.png'
  },
  {
    id: 3,
    name: 'Javascript',
    nameEn: 'Javascript',
    icon: '/assets/img/ico/skills/js.png'
  },
  {
    id: 4,
    name: 'Gulp',
    nameEn: 'Gulp',
    icon: '/assets/img/ico/skills/gulp.png'
  },
  {
    id: 5,
    name: 'Sass',
    nameEn: 'Sass',
    icon: '/assets/img/ico/skills/sass.png'
  },
  {
    id: 6,
    name: 'BEM',
    nameEn: 'BEM',
    icon: '/assets/img/ico/skills/bem.png'
  },
  {
    id: 7,
    name: 'Photoshop',
    nameEn: 'Photoshop',
    icon: '/assets/img/ico/skills/ps.png'
  },
  {
    id: 8,
    name: 'Pixso',
    nameEn: 'Pixso',
    icon: '/assets/img/ico/skills/pixso.png'
  },
  {
    id: 9,
    name: 'Vite',
    nameEn: 'Vite',
    icon: '/assets/img/ico/skills/vite.png'
  },
  {
    id: 10,
    name: 'tailwindCSS',
    nameEn: 'tailwindCSS',
    icon: '/assets/img/ico/skills/tailwind.png'
  },
  {
    id: 11,
    name: 'React',
    nameEn: 'React',
    icon: 'https://reactdev.ru/react.svg'
  }
];

// Данные сертификатов
const certificates = [
  {
    id: 1,
    image: '/assets/img/certificates/c1.jpg',
    alt: 'Сертификат SoloLearn HTML',
    altEn: 'SoloLearn HTML Certificate',
    link: 'https://www.sololearn.com/Certificate/1014-8369424/jpg/'
  },
  {
    id: 2,
    image: '/assets/img/certificates/c2.jpg',
    alt: 'Сертификат SoloLearn CSS',
    altEn: 'SoloLearn CSS Certificate',
    link: 'https://www.sololearn.com/Certificate/1023-8369424/jpg/'
  },
  {
    id: 3,
    image: '/assets/img/certificates/c3.jpg',
    alt: 'Сертификат GeekBrains',
    altEn: 'GeekBrains Certificate',
    link: 'https://geekbrains.ru/certificates/1072678'
  },
  {
    id: 4,
    image: '/assets/img/certificates/c4.jpg',
    alt: 'Сертификат GeekBrains',
    altEn: 'GeekBrains Certificate',
    link: 'https://geekbrains.ru/certificates/1053485'
  },
  {
    id: 5,
    image: '/assets/img/certificates/c5.jpg',
    alt: 'Сертификат GeekBrains',
    altEn: 'GeekBrains Certificate',
    link: 'https://geekbrains.ru/certificates/439257'
  },
  {
    id: 6,
    image: '/assets/img/certificates/c6.jpg',
    alt: 'Сертификат Stepik',
    altEn: 'Stepik Certificate',
    link: 'https://stepik.org/cert/890672'
  },
  {
    id: 7,
    image: '/assets/img/certificates/c7.jpg',
    alt: 'Сертификат Stepik',
    altEn: 'Stepik Certificate',
    link: 'https://stepik.org/certificate/e18fff446fadc8c94b3a33fe930b699100c4dd98.pdf'
  }
];

// Данные переводов для секции "Обо мне"
const aboutContent = {
  ru: [
    "Привет! Меня зовут Ярослав, я frontend-разработчик.",
    "Обучаюсь по онлайн-курсам, тематическим книгам, видео на YouTube и через мобильные приложения, такие как SoloLearn. Постоянно стремлюсь расширять кругозор и углублять знания в веб-разработке.",
    "Создаю лендинги на Gulp-сборке, работаю с макетами из Photoshop и Pixso. В портфолио — учебные и личные проекты, выполненные по найденным в сети макетам и в рамках практики.",
    "Сменил сферу деятельности и полностью посвятил себя развитию в IT. Вижу в этом путь роста, вызовов и вдохновения.",
    "Базовый уровень английского. Умею читать техническую документацию и логически разбирать тексты, при необходимости использую переводчик.",
    "Играю в футбол в любительской лиге, участвую в городских соревнованиях. Люблю хорошую музыку и концерты — они заряжают энергией и вдохновляют.",
    "Буду рад сотрудничеству и предложениям от интересных людей и компаний. Всегда стремлюсь прокачивать навыки и работать над реальными задачами."
  ],
  en: [
    "Hello! My name is Yaroslav, I'm a frontend developer.",
    "I learn through online courses, thematic books, YouTube videos, and mobile apps like SoloLearn. I constantly strive to expand my horizons and deepen my knowledge in web development.",
    "I create landing pages using Gulp build, work with layouts from Photoshop and Pixso. My portfolio includes educational and personal projects based on layouts found online and completed as part of practice.",
    "I changed my field of activity and fully dedicated myself to IT development. I see this as a path of growth, challenges, and inspiration.",
    "Basic level of English. I can read technical documentation and logically analyze texts, using a translator when necessary.",
    "I play football in an amateur league, participate in city competitions. I love good music and concerts — they energize and inspire me.",
    "I would be happy to collaborate and receive offers from interesting people and companies. I always strive to improve my skills and work on real tasks."
  ]
};

// Контактные данные
const contactsData = {
  email: null, // Не указан в переводах
  telegram: '@vidrimers', // Из footer переводов
  linkedin: 'https://www.linkedin.com/in/vidrimers/', // Предполагаемая ссылка
  github: 'https://github.com/vidrimers', // Предполагаемая ссылка
  otherLinks: {}
};

/**
 * Класс для миграции данных
 */
class MigrationService {
  constructor() {
    this.dbService = null;
  }

  /**
   * Инициализация сервиса миграции
   */
  async initialize() {
    this.dbService = new DatabaseService();
    await this.dbService.initialize();
  }

  /**
   * Закрыть сервис миграции
   */
  async close() {
    if (this.dbService) {
      await this.dbService.close();
    }
  }

  /**
   * Мигрировать категории портфолио
   * @returns {Promise<void>}
   */
  async migrateCategories() {
    console.log('🔄 Миграция категорий портфолио...');
    
    const categories = [
      {
        id: 'pet',
        nameRu: 'Собственные проекты',
        nameEn: 'Personal Projects',
        sortOrder: 1
      },
      {
        id: 'layout',
        nameRu: 'Учебные проекты', 
        nameEn: 'Learning Projects',
        sortOrder: 2
      }
    ];

    for (const category of categories) {
      // Проверяем, существует ли категория
      const existing = await this.dbService.getOne('SELECT id FROM categories WHERE id = ?', [category.id]);
      
      if (!existing) {
        await this.dbService.runQuery(`
          INSERT INTO categories (id, name_ru, name_en, sort_order, is_hidden)
          VALUES (?, ?, ?, ?, ?)
        `, [category.id, category.nameRu, category.nameEn, category.sortOrder, false]);
        
        console.log(`✅ Категория "${category.nameRu}" добавлена`);
      } else {
        console.log(`⚠️ Категория "${category.nameRu}" уже существует`);
      }
    }
  }

  /**
   * Мигрировать проекты портфолио
   * @returns {Promise<void>}
   */
  async migrateProjects() {
    console.log('🔄 Миграция проектов портфолио...');
    
    for (let i = 0; i < portfolioProjects.length; i++) {
      const project = portfolioProjects[i];
      
      // Проверяем, существует ли проект
      const existing = await this.dbService.getOne('SELECT id FROM projects WHERE id = ?', [project.id]);
      
      if (!existing) {
        await this.dbService.runQuery(`
          INSERT INTO projects (
            id, title_ru, title_en, description_ru, description_en,
            image_path, link, category_id, is_ai, is_new, is_in_progress,
            is_hidden, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          project.id,
          project.title,
          project.titleEn,
          project.description,
          project.descriptionEn,
          project.image,
          project.link,
          project.category,
          project.isAi,
          project.isNew,
          project.isInProgress,
          false, // is_hidden
          i + 1 // sort_order
        ]);
        
        console.log(`✅ Проект "${project.title}" добавлен`);
      } else {
        console.log(`⚠️ Проект "${project.title}" уже существует`);
      }
    }
  }

  /**
   * Мигрировать навыки
   * @returns {Promise<void>}
   */
  async migrateSkills() {
    console.log('🔄 Миграция навыков...');
    
    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      
      // Проверяем, существует ли навык (по имени, так как ID может дублироваться)
      const existing = await this.dbService.getOne('SELECT id FROM skills WHERE name_ru = ? AND name_en = ?', [skill.name, skill.nameEn]);
      
      if (!existing) {
        await this.dbService.runQuery(`
          INSERT INTO skills (name_ru, name_en, icon_path, sort_order, is_hidden)
          VALUES (?, ?, ?, ?, ?)
        `, [
          skill.name,
          skill.nameEn,
          skill.icon,
          i + 1, // sort_order
          false // is_hidden
        ]);
        
        console.log(`✅ Навык "${skill.name}" добавлен`);
      } else {
        console.log(`⚠️ Навык "${skill.name}" уже существует`);
      }
    }
  }

  /**
   * Мигрировать сертификаты
   * @returns {Promise<void>}
   */
  async migrateCertificates() {
    console.log('🔄 Миграция сертификатов...');
    
    for (let i = 0; i < certificates.length; i++) {
      const cert = certificates[i];
      
      // Проверяем, существует ли сертификат
      const existing = await this.dbService.getOne('SELECT id FROM certificates WHERE image_path = ?', [cert.image]);
      
      if (!existing) {
        await this.dbService.runQuery(`
          INSERT INTO certificates (
            title_ru, title_en, description_ru, description_en,
            image_path, link, sort_order, is_hidden
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          cert.alt, // title_ru
          cert.altEn, // title_en
          null, // description_ru
          null, // description_en
          cert.image,
          cert.link,
          i + 1, // sort_order
          false // is_hidden
        ]);
        
        console.log(`✅ Сертификат "${cert.alt}" добавлен`);
      } else {
        console.log(`⚠️ Сертификат "${cert.alt}" уже существует`);
      }
    }
  }

  /**
   * Мигрировать контент "Обо мне"
   * @returns {Promise<void>}
   */
  async migrateAboutContent() {
    console.log('🔄 Миграция контента "Обо мне"...');
    
    // Проверяем, существует ли контент
    const existing = await this.dbService.getOne('SELECT id FROM about_content WHERE id = 1');
    
    const contentRu = aboutContent.ru.join('\n\n');
    const contentEn = aboutContent.en.join('\n\n');
    
    if (!existing) {
      await this.dbService.runQuery(`
        INSERT INTO about_content (id, content_ru, content_en)
        VALUES (1, ?, ?)
      `, [contentRu, contentEn]);
      
      console.log('✅ Контент "Обо мне" добавлен');
    } else {
      // Обновляем существующий контент
      await this.dbService.runQuery(`
        UPDATE about_content 
        SET content_ru = ?, content_en = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `, [contentRu, contentEn]);
      
      console.log('✅ Контент "Обо мне" обновлен');
    }
  }

  /**
   * Мигрировать контактную информацию
   * @returns {Promise<void>}
   */
  async migrateContacts() {
    console.log('🔄 Миграция контактной информации...');
    
    // Проверяем, существуют ли контакты
    const existing = await this.dbService.getOne('SELECT id FROM contacts WHERE id = 1');
    
    const otherLinksJson = JSON.stringify(contactsData.otherLinks);
    
    if (!existing) {
      await this.dbService.runQuery(`
        INSERT INTO contacts (id, email, telegram, linkedin, github, other_links)
        VALUES (1, ?, ?, ?, ?, ?)
      `, [
        contactsData.email,
        contactsData.telegram,
        contactsData.linkedin,
        contactsData.github,
        otherLinksJson
      ]);
      
      console.log('✅ Контактная информация добавлена');
    } else {
      // Обновляем существующие контакты
      await this.dbService.runQuery(`
        UPDATE contacts 
        SET email = ?, telegram = ?, linkedin = ?, github = ?, other_links = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `, [
        contactsData.email,
        contactsData.telegram,
        contactsData.linkedin,
        contactsData.github,
        otherLinksJson
      ]);
      
      console.log('✅ Контактная информация обновлена');
    }
  }

  /**
   * Выполнить полную миграцию данных
   * @returns {Promise<void>}
   */
  async migrateAllData() {
    console.log('🚀 Начинаем полную миграцию данных...');
    
    try {
      await this.dbService.transaction(async () => {
        await this.migrateCategories();
        await this.migrateProjects();
        await this.migrateSkills();
        await this.migrateCertificates();
        await this.migrateAboutContent();
        await this.migrateContacts();
      });
      
      console.log('✅ Миграция данных завершена успешно!');
    } catch (error) {
      console.error('❌ Ошибка при миграции данных:', error.message);
      throw error;
    }
  }

  /**
   * Проверить, нужна ли миграция
   * @returns {Promise<boolean>}
   */
  async needsMigration() {
    try {
      // Проверяем, есть ли данные в основных таблицах
      const projectsCount = await this.dbService.getOne('SELECT COUNT(*) as count FROM projects');
      const skillsCount = await this.dbService.getOne('SELECT COUNT(*) as count FROM skills');
      const categoriesCount = await this.dbService.getOne('SELECT COUNT(*) as count FROM categories');
      
      return projectsCount.count === 0 || skillsCount.count === 0 || categoriesCount.count === 0;
    } catch (error) {
      console.error('Ошибка при проверке необходимости миграции:', error.message);
      return true; // В случае ошибки считаем, что миграция нужна
    }
  }
}

/**
 * Мигрировать категории портфолио (функция для обратной совместимости)
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @returns {Promise<void>}
 */
async function migrateCategories(db) {
  console.log('🔄 Миграция категорий портфолио...');
  
  const categories = [
    {
      id: 'pet',
      nameRu: 'Собственные проекты',
      nameEn: 'Personal Projects',
      sortOrder: 1
    },
    {
      id: 'layout',
      nameRu: 'Учебные проекты', 
      nameEn: 'Learning Projects',
      sortOrder: 2
    }
  ];

  for (const category of categories) {
    // Проверяем, существует ли категория
    const existing = await getOne(db, 'SELECT id FROM categories WHERE id = ?', [category.id]);
    
    if (!existing) {
      await runQuery(db, `
        INSERT INTO categories (id, name_ru, name_en, sort_order, is_hidden)
        VALUES (?, ?, ?, ?, ?)
      `, [category.id, category.nameRu, category.nameEn, category.sortOrder, false]);
      
      console.log(`✅ Категория "${category.nameRu}" добавлена`);
    } else {
      console.log(`⚠️ Категория "${category.nameRu}" уже существует`);
    }
  }
}

/**
 * Мигрировать проекты портфолио
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @returns {Promise<void>}
 */
async function migrateProjects(db) {
  console.log('🔄 Миграция проектов портфолио...');
  
  for (let i = 0; i < portfolioProjects.length; i++) {
    const project = portfolioProjects[i];
    
    // Проверяем, существует ли проект
    const existing = await getOne(db, 'SELECT id FROM projects WHERE id = ?', [project.id]);
    
    if (!existing) {
      await runQuery(db, `
        INSERT INTO projects (
          id, title_ru, title_en, description_ru, description_en,
          image_path, link, category_id, is_ai, is_new, is_in_progress,
          is_hidden, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        project.id,
        project.title,
        project.titleEn,
        project.description,
        project.descriptionEn,
        project.image,
        project.link,
        project.category,
        project.isAi,
        project.isNew,
        project.isInProgress,
        false, // is_hidden
        i + 1 // sort_order
      ]);
      
      console.log(`✅ Проект "${project.title}" добавлен`);
    } else {
      console.log(`⚠️ Проект "${project.title}" уже существует`);
    }
  }
}

/**
 * Мигрировать навыки
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @returns {Promise<void>}
 */
async function migrateSkills(db) {
  console.log('🔄 Миграция навыков...');
  
  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i];
    
    // Проверяем, существует ли навык (по имени, так как ID может дублироваться)
    const existing = await getOne(db, 'SELECT id FROM skills WHERE name_ru = ? AND name_en = ?', [skill.name, skill.nameEn]);
    
    if (!existing) {
      await runQuery(db, `
        INSERT INTO skills (name_ru, name_en, icon_path, sort_order, is_hidden)
        VALUES (?, ?, ?, ?, ?)
      `, [
        skill.name,
        skill.nameEn,
        skill.icon,
        i + 1, // sort_order
        false // is_hidden
      ]);
      
      console.log(`✅ Навык "${skill.name}" добавлен`);
    } else {
      console.log(`⚠️ Навык "${skill.name}" уже существует`);
    }
  }
}

/**
 * Мигрировать сертификаты
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @returns {Promise<void>}
 */
async function migrateCertificates(db) {
  console.log('🔄 Миграция сертификатов...');
  
  for (let i = 0; i < certificates.length; i++) {
    const cert = certificates[i];
    
    // Проверяем, существует ли сертификат
    const existing = await getOne(db, 'SELECT id FROM certificates WHERE image_path = ?', [cert.image]);
    
    if (!existing) {
      await runQuery(db, `
        INSERT INTO certificates (
          title_ru, title_en, description_ru, description_en,
          image_path, link, sort_order, is_hidden
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        cert.alt, // title_ru
        cert.altEn, // title_en
        null, // description_ru
        null, // description_en
        cert.image,
        cert.link,
        i + 1, // sort_order
        false // is_hidden
      ]);
      
      console.log(`✅ Сертификат "${cert.alt}" добавлен`);
    } else {
      console.log(`⚠️ Сертификат "${cert.alt}" уже существует`);
    }
  }
}

/**
 * Мигрировать контент "Обо мне"
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @returns {Promise<void>}
 */
async function migrateAboutContent(db) {
  console.log('🔄 Миграция контента "Обо мне"...');
  
  // Проверяем, существует ли контент
  const existing = await getOne(db, 'SELECT id FROM about_content WHERE id = 1');
  
  const contentRu = aboutContent.ru.join('\n\n');
  const contentEn = aboutContent.en.join('\n\n');
  
  if (!existing) {
    await runQuery(db, `
      INSERT INTO about_content (id, content_ru, content_en)
      VALUES (1, ?, ?)
    `, [contentRu, contentEn]);
    
    console.log('✅ Контент "Обо мне" добавлен');
  } else {
    // Обновляем существующий контент
    await runQuery(db, `
      UPDATE about_content 
      SET content_ru = ?, content_en = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [contentRu, contentEn]);
    
    console.log('✅ Контент "Обо мне" обновлен');
  }
}

/**
 * Мигрировать контактную информацию
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @returns {Promise<void>}
 */
async function migrateContacts(db) {
  console.log('🔄 Миграция контактной информации...');
  
  // Проверяем, существуют ли контакты
  const existing = await getOne(db, 'SELECT id FROM contacts WHERE id = 1');
  
  const otherLinksJson = JSON.stringify(contactsData.otherLinks);
  
  if (!existing) {
    await runQuery(db, `
      INSERT INTO contacts (id, email, telegram, linkedin, github, other_links)
      VALUES (1, ?, ?, ?, ?, ?)
    `, [
      contactsData.email,
      contactsData.telegram,
      contactsData.linkedin,
      contactsData.github,
      otherLinksJson
    ]);
    
    console.log('✅ Контактная информация добавлена');
  } else {
    // Обновляем существующие контакты
    await runQuery(db, `
      UPDATE contacts 
      SET email = ?, telegram = ?, linkedin = ?, github = ?, other_links = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [
      contactsData.email,
      contactsData.telegram,
      contactsData.linkedin,
      contactsData.github,
      otherLinksJson
    ]);
    
    console.log('✅ Контактная информация обновлена');
  }
}

/**
 * Выполнить полную миграцию данных
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @returns {Promise<void>}
 */
async function runFullMigration(db) {
  console.log('🚀 Начинаем полную миграцию данных...');
  
  try {
    await transaction(db, async (db) => {
      await migrateCategories(db);
      await migrateProjects(db);
      await migrateSkills(db);
      await migrateCertificates(db);
      await migrateAboutContent(db);
      await migrateContacts(db);
    });
    
    console.log('✅ Миграция данных завершена успешно!');
  } catch (error) {
    console.error('❌ Ошибка при миграции данных:', error.message);
    throw error;
  }
}

/**
 * Проверить, нужна ли миграция
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @returns {Promise<boolean>}
 */
async function needsMigration(db) {
  try {
    // Проверяем, есть ли данные в основных таблицах
    const projectsCount = await getOne(db, 'SELECT COUNT(*) as count FROM projects');
    const skillsCount = await getOne(db, 'SELECT COUNT(*) as count FROM skills');
    const categoriesCount = await getOne(db, 'SELECT COUNT(*) as count FROM categories');
    
    return projectsCount.count === 0 || skillsCount.count === 0 || categoriesCount.count === 0;
  } catch (error) {
    console.error('Ошибка при проверке необходимости миграции:', error.message);
    return true; // В случае ошибки считаем, что миграция нужна
  }
}

/**
 * Мигрировать проекты портфолио (функция для обратной совместимости)
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @returns {Promise<void>}
 */
async function migrateProjects(db) {
  console.log('🔄 Миграция проектов портфолио...');
  
  for (let i = 0; i < portfolioProjects.length; i++) {
    const project = portfolioProjects[i];
    
    // Проверяем, существует ли проект
    const existing = await getOne(db, 'SELECT id FROM projects WHERE id = ?', [project.id]);
    
    if (!existing) {
      await runQuery(db, `
        INSERT INTO projects (
          id, title_ru, title_en, description_ru, description_en,
          image_path, link, category_id, is_ai, is_new, is_in_progress,
          is_hidden, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        project.id,
        project.title,
        project.titleEn,
        project.description,
        project.descriptionEn,
        project.image,
        project.link,
        project.category,
        project.isAi,
        project.isNew,
        project.isInProgress,
        false, // is_hidden
        i + 1 // sort_order
      ]);
      
      console.log(`✅ Проект "${project.title}" добавлен`);
    } else {
      console.log(`⚠️ Проект "${project.title}" уже существует`);
    }
  }
}

/**
 * Мигрировать навыки (функция для обратной совместимости)
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @returns {Promise<void>}
 */
async function migrateSkills(db) {
  console.log('🔄 Миграция навыков...');
  
  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i];
    
    // Проверяем, существует ли навык (по имени, так как ID может дублироваться)
    const existing = await getOne(db, 'SELECT id FROM skills WHERE name_ru = ? AND name_en = ?', [skill.name, skill.nameEn]);
    
    if (!existing) {
      await runQuery(db, `
        INSERT INTO skills (name_ru, name_en, icon_path, sort_order, is_hidden)
        VALUES (?, ?, ?, ?, ?)
      `, [
        skill.name,
        skill.nameEn,
        skill.icon,
        i + 1, // sort_order
        false // is_hidden
      ]);
      
      console.log(`✅ Навык "${skill.name}" добавлен`);
    } else {
      console.log(`⚠️ Навык "${skill.name}" уже существует`);
    }
  }
}

/**
 * Мигрировать сертификаты (функция для обратной совместимости)
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @returns {Promise<void>}
 */
async function migrateCertificates(db) {
  console.log('🔄 Миграция сертификатов...');
  
  for (let i = 0; i < certificates.length; i++) {
    const cert = certificates[i];
    
    // Проверяем, существует ли сертификат
    const existing = await getOne(db, 'SELECT id FROM certificates WHERE image_path = ?', [cert.image]);
    
    if (!existing) {
      await runQuery(db, `
        INSERT INTO certificates (
          title_ru, title_en, description_ru, description_en,
          image_path, link, sort_order, is_hidden
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        cert.alt, // title_ru
        cert.altEn, // title_en
        null, // description_ru
        null, // description_en
        cert.image,
        cert.link,
        i + 1, // sort_order
        false // is_hidden
      ]);
      
      console.log(`✅ Сертификат "${cert.alt}" добавлен`);
    } else {
      console.log(`⚠️ Сертификат "${cert.alt}" уже существует`);
    }
  }
}

/**
 * Мигрировать контент "Обо мне" (функция для обратной совместимости)
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @returns {Promise<void>}
 */
async function migrateAboutContent(db) {
  console.log('🔄 Миграция контента "Обо мне"...');
  
  // Проверяем, существует ли контент
  const existing = await getOne(db, 'SELECT id FROM about_content WHERE id = 1');
  
  const contentRu = aboutContent.ru.join('\n\n');
  const contentEn = aboutContent.en.join('\n\n');
  
  if (!existing) {
    await runQuery(db, `
      INSERT INTO about_content (id, content_ru, content_en)
      VALUES (1, ?, ?)
    `, [contentRu, contentEn]);
    
    console.log('✅ Контент "Обо мне" добавлен');
  } else {
    // Обновляем существующий контент
    await runQuery(db, `
      UPDATE about_content 
      SET content_ru = ?, content_en = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [contentRu, contentEn]);
    
    console.log('✅ Контент "Обо мне" обновлен');
  }
}

/**
 * Мигрировать контактную информацию (функция для обратной совместимости)
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @returns {Promise<void>}
 */
async function migrateContacts(db) {
  console.log('🔄 Миграция контактной информации...');
  
  // Проверяем, существуют ли контакты
  const existing = await getOne(db, 'SELECT id FROM contacts WHERE id = 1');
  
  const otherLinksJson = JSON.stringify(contactsData.otherLinks);
  
  if (!existing) {
    await runQuery(db, `
      INSERT INTO contacts (id, email, telegram, linkedin, github, other_links)
      VALUES (1, ?, ?, ?, ?, ?)
    `, [
      contactsData.email,
      contactsData.telegram,
      contactsData.linkedin,
      contactsData.github,
      otherLinksJson
    ]);
    
    console.log('✅ Контактная информация добавлена');
  } else {
    // Обновляем существующие контакты
    await runQuery(db, `
      UPDATE contacts 
      SET email = ?, telegram = ?, linkedin = ?, github = ?, other_links = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [
      contactsData.email,
      contactsData.telegram,
      contactsData.linkedin,
      contactsData.github,
      otherLinksJson
    ]);
    
    console.log('✅ Контактная информация обновлена');
  }
}

/**
 * Выполнить полную миграцию данных (функция для обратной совместимости)
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @returns {Promise<void>}
 */
async function runFullMigration(db) {
  console.log('🚀 Начинаем полную миграцию данных...');
  
  try {
    await transaction(db, async (db) => {
      await migrateCategories(db);
      await migrateProjects(db);
      await migrateSkills(db);
      await migrateCertificates(db);
      await migrateAboutContent(db);
      await migrateContacts(db);
    });
    
    console.log('✅ Миграция данных завершена успешно!');
  } catch (error) {
    console.error('❌ Ошибка при миграции данных:', error.message);
    throw error;
  }
}

/**
 * Проверить, нужна ли миграция (функция для обратной совместимости)
 * @param {sqlite3.Database} db - Экземпляр базы данных
 * @returns {Promise<boolean>}
 */
async function needsMigration(db) {
  try {
    // Проверяем, есть ли данные в основных таблицах
    const projectsCount = await getOne(db, 'SELECT COUNT(*) as count FROM projects');
    const skillsCount = await getOne(db, 'SELECT COUNT(*) as count FROM skills');
    const categoriesCount = await getOne(db, 'SELECT COUNT(*) as count FROM categories');
    
    return projectsCount.count === 0 || skillsCount.count === 0 || categoriesCount.count === 0;
  } catch (error) {
    console.error('Ошибка при проверке необходимости миграции:', error.message);
    return true; // В случае ошибки считаем, что миграция нужна
  }
}

module.exports = MigrationService;

// Экспортируем также функции для обратной совместимости
module.exports.runFullMigration = runFullMigration;
module.exports.needsMigration = needsMigration;
module.exports.migrateCategories = migrateCategories;
module.exports.migrateProjects = migrateProjects;
module.exports.migrateSkills = migrateSkills;
module.exports.migrateCertificates = migrateCertificates;
module.exports.migrateAboutContent = migrateAboutContent;
module.exports.migrateContacts = migrateContacts;