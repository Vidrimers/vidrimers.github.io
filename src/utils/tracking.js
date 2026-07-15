// Клиентский трекер визитов и кликов

// Генерация уникального ID посетителя на основе User-Agent
function getVisitorId() {
  const key = 'vidrimers_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    const ua = navigator.userAgent;
    // Берём хеш от User-Agent для уникальности
    let hash = 0;
    for (let i = 0; i < ua.length; i++) {
      const chr = ua.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    id = 'v_' + Math.abs(hash).toString(36);
    localStorage.setItem(key, id);
  }
  return id;
}

function getVisitorInfo() {
  const ua = navigator.userAgent;
  // Определяем браузер
  let browser = 'Другой';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  // Определяем ОС
  let os = 'Другое';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return { browser, os, ua: ua.slice(0, 200) };
}

// Логирование визита
export function trackVisit() {
  try {
    const visitorId = getVisitorId();
    const info = getVisitorInfo();
    const isAdmin = !!localStorage.getItem('admin_token');
    fetch('/api/track/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: window.location.pathname,
        visitorId,
        browser: info.browser,
        os: info.os,
        userAgent: info.ua,
        isAdmin
      }),
      keepalive: true
    }).catch(() => {});
  } catch {}
}

// Логирование клика по проекту
export function trackProjectClick(projectId, linkUrl) {
  try {
    const visitorId = getVisitorId();
    const isAdmin = !!localStorage.getItem('admin_token');
    fetch('/api/track/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'project', entityId: projectId, linkUrl, visitorId, isAdmin }),
      keepalive: true
    }).catch(() => {});
  } catch {}
}

// Логирование клика по Donate
export function trackDonateClick() {
  try {
    const visitorId = getVisitorId();
    const isAdmin = !!localStorage.getItem('admin_token');
    fetch('/api/track/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'donate', entityId: null, linkUrl: window.location.pathname, visitorId, isAdmin }),
      keepalive: true
    }).catch(() => {});
  } catch {}
}
