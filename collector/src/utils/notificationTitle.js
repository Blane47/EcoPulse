// The server writes notification titles in English; known types are rendered in
// the collector's language instead. The body is data (location, zone, note) and is shown as-is.
export function notificationTitle(item, en) {
  if (item.type === 'report_assigned') return en ? 'New report assigned' : 'Nouveau signalement assigné';
  if (item.type === 'report_unassigned') {
    return en ? 'Report reassigned to another collector' : 'Signalement réassigné à un autre collecteur';
  }
  if (item.type === 'proof_approved') return en ? 'Collection approved' : 'Collecte approuvée';
  if (item.type === 'proof_rejected') return en ? 'Proof photo rejected — redo and resend' : 'Photo refusée — à refaire et renvoyer';
  return item.title;
}

// Notifications about a report the collector still has (all but reassignment away) open that report
export const opensReport = (item) => !!item.report && item.type !== 'report_unassigned';
