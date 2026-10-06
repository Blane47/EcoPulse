// The server writes notification titles in English; known types are rendered in
// the collector's language instead. The body is data (location, zone, note) and is shown as-is.
export function notificationTitle(item, en) {
  if (item.type === 'report_assigned') return en ? 'New report assigned' : 'Nouveau signalement assigné';
  if (item.type === 'report_unassigned') {
    return en ? 'Report reassigned to another collector' : 'Signalement réassigné à un autre collecteur';
  }
  return item.title;
}
