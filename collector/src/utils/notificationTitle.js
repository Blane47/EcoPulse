// The server writes notification titles in English; known types are rendered in
// the collector's language instead. The body is data (location, zone, note) and is shown as-is.
export function notificationTitle(item, en) {
  if (item.type === 'report_assigned') return en ? 'New report assigned' : 'Nouveau signalement assigné';
  if (item.type === 'report_unassigned') {
    return en ? 'Report reassigned to another collector' : 'Signalement réassigné à un autre collecteur';
  }
  if (item.type === 'proof_approved') return en ? 'Collection approved' : 'Collecte approuvée';
  if (item.type === 'proof_rejected') return en ? 'Proof photo rejected — redo and resend' : 'Photo refusée — à refaire et renvoyer';
  if (item.type === 'leave_approved') return en ? 'Leave approved' : 'Congé approuvé';
  if (item.type === 'leave_declined') return en ? 'Leave declined' : 'Congé refusé';
  if (item.type === 'leave_cancelled') {
    // The admin either cancels leave before it starts or ends it early
    if (item.title === 'Leave ended early') return en ? 'Leave ended early by the admin' : 'Congé écourté par l’admin';
    return en ? 'Leave cancelled by the admin' : 'Congé annulé par l’admin';
  }
  if (item.type === 'leave_started') return en ? 'Your leave has started' : 'Votre congé a commencé';
  if (item.type === 'leave_ended') return en ? 'Welcome back — you’re on duty again' : 'Bon retour — vous êtes de nouveau en service';
  return item.title;
}

// Notifications about a report the collector still has (all but reassignment away) open that report
export const opensReport = (item) => !!item.report && item.type !== 'report_unassigned';

// Answers about leave requests open the Leave screen
export const opensLeave = (item) => typeof item.type === 'string' && item.type.startsWith('leave_');
