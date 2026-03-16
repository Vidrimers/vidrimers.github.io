/**
 * Данные сертификатов
 * 
 * Структура объекта сертификата:
 * - id: уникальный идентификатор
 * - image: путь к изображению сертификата
 * - alt: альтернативный текст для изображения (русский)
 * - altEn: альтернативный текст для изображения (английский)
 */

export const certificates = [
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

/**
 * Получить все сертификаты
 * @returns {Array} Массив сертификатов
 */
export const getAllCertificates = () => {
  return certificates;
};

/**
 * Получить сертификат по ID
 * @param {number} id - ID сертификата
 * @returns {Object|undefined} Объект сертификата или undefined
 */
export const getCertificateById = (id) => {
  return certificates.find(certificate => certificate.id === id);
};

/**
 * Получить общее количество сертификатов
 * @returns {number} Количество сертификатов
 */
export const getCertificatesCount = () => {
  return certificates.length;
};
