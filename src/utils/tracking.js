// Клиентский трекер визитов и кликов

// Логирование визита при загрузке страницы
export function trackVisit() {
  try {
    fetch('/api/track/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: window.location.pathname }),
      keepalive: true
    }).catch(() => {});
  } catch {}
}

// Логирование клика по ссылке проекта
export function trackProjectClick(projectId, linkUrl) {
  try {
    fetch('/api/track/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'project', entityId: projectId, linkUrl }),
      keepalive: true
    }).catch(() => {});
  } catch {}
}

// Логирование клика по кнопке Donate
export function trackDonateClick() {
  try {
    fetch('/api/track/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'donate', entityId: null, linkUrl: window.location.pathname }),
      keepalive: true
    }).catch(() => {});
  } catch {}
}
