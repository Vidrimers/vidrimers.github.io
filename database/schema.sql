-- Схема базы данных для CMS системы
-- SQLite база данных для хранения всего контента сайта

-- Таблица категорий портфолио
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Таблица проектов портфолио
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title_ru TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ru TEXT NOT NULL,
  description_en TEXT NOT NULL,
  image_path TEXT,
  link TEXT,
  category_id TEXT NOT NULL,
  is_ai BOOLEAN DEFAULT FALSE,
  is_new BOOLEAN DEFAULT FALSE,
  is_in_progress BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories (id)
);

-- Таблица навыков
CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  icon_path TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Таблица сертификатов
CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_ru TEXT,
  title_en TEXT,
  description_ru TEXT,
  description_en TEXT,
  image_path TEXT NOT NULL,
  link TEXT,
  date_issued DATE,
  sort_order INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Таблица контента "Обо мне"
CREATE TABLE IF NOT EXISTS about_content (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Только одна запись
  content_ru TEXT NOT NULL,
  content_en TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Таблица контактной информации
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Только одна запись
  email TEXT,
  telegram TEXT,
  linkedin TEXT,
  github TEXT,
  other_links TEXT, -- JSON строка для дополнительных ссылок
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Таблица кошельков для донатов
CREATE TABLE IF NOT EXISTS donate_wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  color TEXT DEFAULT '#888888',
  sort_order INTEGER DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_donate_wallets_sort ON donate_wallets(sort_order);
CREATE INDEX IF NOT EXISTS idx_donate_wallets_hidden ON donate_wallets(is_hidden);

CREATE TRIGGER IF NOT EXISTS update_donate_wallets_timestamp
  AFTER UPDATE ON donate_wallets
  BEGIN
    UPDATE donate_wallets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Таблица текстов футера
CREATE TABLE IF NOT EXISTS footer_content (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  title_ru TEXT NOT NULL DEFAULT 'Контакты',
  title_en TEXT NOT NULL DEFAULT 'Contacts',
  text_ru TEXT NOT NULL DEFAULT 'Связаться со мной можно по данным ссылочкам',
  text_en TEXT NOT NULL DEFAULT 'You can contact me through these links',
  send_message_ru TEXT NOT NULL DEFAULT 'Отправить сообщение',
  send_message_en TEXT NOT NULL DEFAULT 'Send message',
  find_me_ru TEXT NOT NULL DEFAULT 'Найти меня можно',
  find_me_en TEXT NOT NULL DEFAULT 'You can find me',
  on_social_ru TEXT NOT NULL DEFAULT 'В линкедине и телеграме',
  on_social_en TEXT NOT NULL DEFAULT 'On LinkedIn and Telegram',
  thanks_ru TEXT NOT NULL DEFAULT 'СПАСИБО :-)',
  thanks_en TEXT NOT NULL DEFAULT 'THANK YOU :-)',
  donate_ru TEXT NOT NULL DEFAULT 'Донатная',
  donate_en TEXT NOT NULL DEFAULT 'Donate',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS update_footer_content_timestamp
  AFTER UPDATE ON footer_content
  BEGIN
    UPDATE footer_content SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Таблица настроек сайта
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Только одна запись
  portfolio_sort_order TEXT DEFAULT 'sort_order', -- Поле для сортировки портфолио
  portfolio_sort_direction TEXT DEFAULT 'asc', -- Направление сортировки (asc/desc)
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  seo_keywords TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Таблица сессий администратора
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Таблица логов активности
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT, -- JSON строка с деталями
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category_id);
CREATE INDEX IF NOT EXISTS idx_projects_sort ON projects(sort_order);
CREATE INDEX IF NOT EXISTS idx_projects_hidden ON projects(is_hidden);

CREATE INDEX IF NOT EXISTS idx_skills_sort ON skills(sort_order);
CREATE INDEX IF NOT EXISTS idx_skills_hidden ON skills(is_hidden);

CREATE INDEX IF NOT EXISTS idx_certificates_sort ON certificates(sort_order);
CREATE INDEX IF NOT EXISTS idx_certificates_hidden ON certificates(is_hidden);

CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_hidden ON categories(is_hidden);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON admin_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_entity ON activity_logs(entity_type, entity_id);

CREATE TRIGGER IF NOT EXISTS update_settings_timestamp 
  AFTER UPDATE ON site_settings
  BEGIN
    UPDATE site_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER IF NOT EXISTS update_projects_timestamp 
  AFTER UPDATE ON projects
  BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_categories_timestamp 
  AFTER UPDATE ON categories
  BEGIN
    UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_skills_timestamp 
  AFTER UPDATE ON skills
  BEGIN
    UPDATE skills SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_certificates_timestamp 
  AFTER UPDATE ON certificates
  BEGIN
    UPDATE certificates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_about_timestamp 
  AFTER UPDATE ON about_content
  BEGIN
    UPDATE about_content SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_contacts_timestamp 
  AFTER UPDATE ON contacts
  BEGIN
    UPDATE contacts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;