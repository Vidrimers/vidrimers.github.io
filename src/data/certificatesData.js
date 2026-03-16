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
    alt: 'Сертификат 1',
    altEn: 'Certificate 1'
  },
  {
    id: 2,
    image: '/assets/img/certificates/c2.jpg',
    alt: 'Сертификат 2',
    altEn: 'Certificate 2'
  },
  {
    id: 3,
    image: '/assets/img/certificates/c3.jpg',
    alt: 'Сертификат 3',
    altEn: 'Certificate 3'
  },
  {
    id: 4,
    image: '/assets/img/certificates/c4.jpg',
    alt: 'Сертификат 4',
    altEn: 'Certificate 4'
  },
  {
    id: 5,
    image: '/assets/img/certificates/c5.jpg',
    alt: 'Сертификат 5',
    altEn: 'Certificate 5'
  },
  {
    id: 6,
    image: '/assets/img/certificates/c6.jpg',
    alt: 'Сертификат 6',
    altEn: 'Certificate 6'
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
