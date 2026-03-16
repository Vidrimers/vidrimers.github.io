/**
 * Данные навыков
 * 
 * Структура объекта навыка:
 * - id: уникальный идентификатор
 * - name: название навыка (русский)
 * - nameEn: название навыка (английский)
 * - icon: путь к иконке
 */

export const skills = [
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
  }
];

/**
 * Получить все навыки
 * @returns {Array} Массив навыков
 */
export const getAllSkills = () => {
  return skills;
};

/**
 * Получить навык по ID
 * @param {number} id - ID навыка
 * @returns {Object|undefined} Объект навыка или undefined
 */
export const getSkillById = (id) => {
  return skills.find(skill => skill.id === id);
};
