export function requestNotificationPermission() {
  if (!('Notification' in window)) return Promise.resolve(false)
  return Notification.requestPermission().then(p => p === 'granted')
}

export function scheduleStudyReminder(hour = 9) {
  // Usa localStorage para guardar hora preferida
  localStorage.setItem('cognify_reminder_hour', hour)
}

export function getReminderHour() {
  return parseInt(localStorage.getItem('cognify_reminder_hour') || '9')
}

export function showReminderIfDue(totalDue) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  if (totalDue === 0) return
  const today = new Date().toISOString().slice(0, 10)
  const lastShown = localStorage.getItem('cognify_reminder_shown')
  if (lastShown === today) return
  const hour = getReminderHour()
  if (new Date().getHours() < hour) return
  localStorage.setItem('cognify_reminder_shown', today)
  new Notification('🐶 Kuma te espera!', {
    body: `Tenés ${totalDue} tarjeta${totalDue !== 1 ? 's' : ''} para repasar hoy.`,
    icon: '/favicon.ico',
  })
}
