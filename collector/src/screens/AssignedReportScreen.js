import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { colors, gradients, shadows } from '../theme';
import { navigateToBin } from '../utils/collectBin';
import { MapPinIcon, CheckIcon, CameraIcon, ClockIcon } from '../components/Icons';
import { playSuccess } from '../utils/sounds';
import { shrinkPhoto } from '../utils/shrinkPhoto';
import api from '../api/axios';

const STATUS_STYLE = {
  assigned: { bg: '#ede9fe', fg: '#7c3aed', en: 'Assigned', fr: 'Assigné' },
  awaiting_review: { bg: colors.amberLight, fg: '#b45309', en: 'In review', fr: 'En vérification' },
  collected: { bg: colors.accentLight, fg: colors.accent, en: 'Collected', fr: 'Collecté' },
};

// Current position for the proof; falls back to the last known fix if a fresh one is slow
async function getProofLocation() {
  try {
    const fix = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
    ]);
    return fix.coords;
  } catch {
    const last = await Location.getLastKnownPositionAsync();
    return last?.coords || null;
  }
}

// A community report the admin assigned to this collector from the dashboard.
// Closing it works like a delivery photo: the collector photographs the cleared spot,
// the photo and GPS position go to the admin, who approves or sends it back.
export default function AssignedReportScreen({ route }) {
  const { id } = route.params;
  const { language } = useAuth();
  const en = language === 'en';
  const [report, setReport] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | missing | error
  const [capturing, setCapturing] = useState(false);
  const [draft, setDraft] = useState(null); // { uri, photo, lat, lng } before it's sent
  const [sending, setSending] = useState(false);

  const fetchReport = useCallback(async () => {
    setState('loading');
    try {
      const { data } = await api.get('/reports/assigned/me');
      const found = data.find((r) => r._id === id);
      setReport(found || null);
      setState(found ? 'ready' : 'missing');
    } catch {
      setState('error');
    }
  }, [id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const takeProofPhoto = async () => {
    const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
    if (locStatus !== 'granted') {
      Alert.alert(
        en ? 'Location required' : 'Localisation requise',
        en
          ? 'Your location is sent with the photo so the admin can see where it was taken.'
          : "Votre position est envoyée avec la photo pour que l'admin voie où elle a été prise."
      );
      return;
    }
    const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (camStatus !== 'granted') {
      Alert.alert(
        en ? 'Camera required' : 'Appareil photo requis',
        en ? 'Allow camera access to photograph the cleared spot.' : "Autorisez l'appareil photo pour photographier l'endroit nettoyé."
      );
      return;
    }

    setCapturing(true);
    // Get the GPS fix while the collector is taking the photo
    const locationPromise = getProofLocation();
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;
      let shrunk;
      try {
        shrunk = await shrinkPhoto(result.assets[0]);
      } catch {
        Alert.alert(en ? 'Photo problem' : 'Problème de photo', en ? 'Could not process the photo. Please try again.' : 'Impossible de traiter la photo. Veuillez réessayer.');
        return;
      }
      const coords = await locationPromise;
      if (!coords) {
        Alert.alert(
          en ? 'No GPS position' : 'Pas de position GPS',
          en ? 'Could not get your location. Move to an open area and try again.' : "Position introuvable. Allez dans un endroit dégagé et réessayez."
        );
        return;
      }
      setDraft({
        uri: shrunk.uri,
        photo: shrunk.dataUrl,
        lat: coords.latitude,
        lng: coords.longitude,
      });
    } finally {
      setCapturing(false);
    }
  };

  const sendProof = async () => {
    setSending(true);
    try {
      const { data } = await api.post(`/reports/${id}/proof`, { photo: draft.photo, lat: draft.lat, lng: draft.lng });
      setReport(data);
      setDraft(null);
      playSuccess();
    } catch (err) {
      const status = err.response?.status;
      let msg;
      if (!err.response) {
        msg = en ? 'No connection. Your photo is kept — try sending again.' : 'Pas de connexion. Votre photo est gardée — réessayez.';
      } else if (status === 413) {
        msg = en ? 'The photo is too large. Retake it and try again.' : 'La photo est trop lourde. Reprenez-la et réessayez.';
      } else if (status === 403) {
        msg = en ? 'This report is no longer assigned to you.' : "Ce signalement ne vous est plus assigné.";
      } else if (en) {
        msg = err.response.data?.message || 'Please try again.';
      } else {
        msg = 'Veuillez réessayer.';
      }
      Alert.alert(en ? 'Proof not sent' : 'Preuve non envoyée', msg);
    }
    setSending(false);
  };

  if (state === 'loading') {
    return (
      <LinearGradient colors={gradients.screenBg} style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </LinearGradient>
    );
  }

  if (state !== 'ready') {
    return (
      <LinearGradient colors={gradients.screenBg} style={styles.centered}>
        <Text style={styles.messageTitle}>
          {state === 'missing'
            ? (en ? 'Report no longer assigned' : 'Signalement plus assigné')
            : (en ? 'Could not load report' : 'Impossible de charger le signalement')}
        </Text>
        <Text style={styles.messageText}>
          {state === 'missing'
            ? (en ? 'This report was reassigned or removed by the admin.' : "Ce signalement a été réassigné ou supprimé par l'admin.")
            : (en ? 'Check your internet connection and try again.' : 'Vérifiez votre connexion internet et réessayez.')}
        </Text>
        {state === 'error' && (
          <TouchableOpacity style={styles.retryBtn} onPress={fetchReport}>
            <Text style={styles.retryText}>{en ? 'Retry' : 'Réessayer'}</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    );
  }

  const formatDate = (d) => new Date(d).toLocaleDateString(en ? 'en-GB' : 'fr-FR');
  const formatDateTime = (d) =>
    new Date(d).toLocaleString(en ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const hasCoords = !!(report.coordinates?.lat && report.coordinates?.lng);
  const statusStyle = STATUS_STYLE[report.status] || STATUS_STYLE.assigned;
  const rejected = report.status === 'assigned' && report.review?.decision === 'rejected';

  // Preview of the photo just taken: retake or send
  if (draft) {
    return (
      <LinearGradient colors={gradients.screenBg} style={styles.container}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <Text style={styles.previewTitle}>{en ? 'Check your photo' : 'Vérifiez votre photo'}</Text>
          <Text style={styles.previewHint}>
            {en
              ? 'The admin will compare it with the resident’s photo. Make sure the cleared spot is clearly visible.'
              : 'L’admin la comparera avec la photo du résident. Assurez-vous que l’endroit nettoyé est bien visible.'}
          </Text>
          <Image source={{ uri: draft.uri }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={takeProofPhoto} disabled={sending || capturing} activeOpacity={0.8}>
              <Text style={styles.secondaryBtnText}>{en ? 'Retake' : 'Reprendre'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.collectBtn} onPress={sendProof} disabled={sending} activeOpacity={0.8}>
              <LinearGradient colors={gradients.greenButton} style={styles.collectGradient}>
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.collectBtnText}>{en ? 'Send proof' : 'Envoyer la preuve'}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setDraft(null)} disabled={sending} style={styles.cancelLink}>
            <Text style={styles.cancelLinkText}>{en ? 'Cancel' : 'Annuler'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {rejected && (
          <View style={[styles.banner, styles.bannerRejected]}>
            <Text style={[styles.bannerTitle, { color: '#991b1b' }]}>
              {en ? 'Your last photo was rejected' : 'Votre dernière photo a été refusée'}
            </Text>
            {!!report.review?.note && <Text style={[styles.bannerText, { color: '#b91c1c' }]}>“{report.review.note}”</Text>}
            <Text style={[styles.bannerText, { color: '#b91c1c' }]}>
              {en ? 'Finish the job, then send a new photo.' : 'Terminez le travail, puis envoyez une nouvelle photo.'}
            </Text>
          </View>
        )}

        {report.status === 'awaiting_review' && (
          <View style={[styles.banner, styles.bannerReview]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ClockIcon size={16} color="#b45309" />
              <Text style={[styles.bannerTitle, { color: '#92400e' }]}>
                {en ? 'Waiting for admin review' : "En attente de vérification par l'admin"}
              </Text>
            </View>
            <Text style={[styles.bannerText, { color: '#a16207' }]}>
              {en
                ? 'You’ll get a notification when your photo is approved or if anything needs redoing.'
                : 'Vous serez notifié quand votre photo sera approuvée ou s’il faut refaire quelque chose.'}
            </Text>
          </View>
        )}

        {report.status === 'collected' && (
          <View style={[styles.banner, styles.bannerApproved]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CheckIcon size={16} color={colors.accentDark} />
              <Text style={[styles.bannerTitle, { color: '#166534' }]}>
                {en ? 'Approved — well done!' : 'Approuvé — bien joué !'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          {report.photo ? (
            <>
              <Text style={styles.detailLabel}>{en ? 'Reported by the resident' : 'Signalé par le résident'}</Text>
              <Image source={{ uri: report.photo }} style={styles.photo} resizeMode="cover" />
            </>
          ) : null}

          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.location}>{report.location}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                <MapPinIcon size={12} color={colors.textSecondary} />
                <Text style={styles.zone}>{report.zone}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.fg }]}>{en ? statusStyle.en : statusStyle.fr}</Text>
            </View>
          </View>

          {!!report.note && (
            <View style={styles.noteBox}>
              <Text style={styles.detailLabel}>{en ? "Resident's note" : 'Note du résident'}</Text>
              <Text style={styles.noteText}>{report.note}</Text>
            </View>
          )}

          <View style={styles.detailsGrid}>
            {[
              { label: en ? 'Reported by' : 'Signalé par', value: report.reporterName || (en ? 'Resident' : 'Résident') },
              { label: en ? 'Reported' : 'Signalé le', value: formatDate(report.createdAt) },
              { label: en ? 'Assigned' : 'Assigné le', value: report.assignedAt ? formatDate(report.assignedAt) : '—' },
              { label: en ? 'Collected' : 'Collecté le', value: report.collectedAt ? formatDate(report.collectedAt) : '—' },
            ].map((d) => (
              <View key={d.label} style={styles.detailItem}>
                <Text style={styles.detailLabel}>{d.label}</Text>
                <Text style={styles.detailValue}>{d.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* The proof photo the collector sent (kept as a record once approved) */}
        {report.proof?.photo && report.status !== 'assigned' && (
          <View style={styles.card}>
            <Text style={styles.detailLabel}>{en ? 'Your proof photo' : 'Votre photo de preuve'}</Text>
            <Image source={{ uri: report.proof.photo }} style={styles.photo} resizeMode="cover" />
            {!!report.proof.submittedAt && (
              <Text style={styles.proofMeta}>
                {en ? 'Sent' : 'Envoyée le'} {formatDateTime(report.proof.submittedAt)}
              </Text>
            )}
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.navigateBtn, !hasCoords && { opacity: 0.5 }]}
            onPress={() => navigateToBin(report)}
            disabled={!hasCoords}
            activeOpacity={0.8}
          >
            <View style={styles.navigateBtnInner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MapPinIcon size={16} color={colors.accent} />
                <Text style={styles.navigateBtnText}>{en ? 'Navigate' : 'Y aller'}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {report.status === 'assigned' && (
            <TouchableOpacity style={styles.collectBtn} onPress={takeProofPhoto} disabled={capturing} activeOpacity={0.8}>
              <LinearGradient colors={gradients.greenButton} style={styles.collectGradient}>
                {capturing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <CameraIcon size={16} color="#fff" />
                    <Text style={styles.collectBtnText}>
                      {rejected ? (en ? 'New proof photo' : 'Nouvelle photo') : (en ? 'Take proof photo' : 'Photo de preuve')}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {report.status === 'assigned' && (
          <Text style={styles.howItWorks}>
            {en
              ? 'When the spot is clear, take a photo of it. The admin checks it before the report is closed.'
              : "Quand l'endroit est propre, prenez-le en photo. L'admin la vérifie avant de clôturer le signalement."}
          </Text>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  messageTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  messageText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  retryBtn: { marginTop: 18, backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  banner: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 16, gap: 4 },
  bannerRejected: { backgroundColor: colors.criticalLight, borderColor: '#fca5a5' },
  bannerReview: { backgroundColor: colors.amberLight, borderColor: '#fcd34d' },
  bannerApproved: { backgroundColor: colors.accentLight, borderColor: '#86efac' },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  bannerText: { fontSize: 13, lineHeight: 18 },
  card: {
    backgroundColor: colors.cardGlass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.1)',
    padding: 16,
    marginBottom: 20,
    ...shadows.cardHover,
  },
  photo: { width: '100%', height: 200, borderRadius: 14, marginBottom: 16 },
  proofMeta: { fontSize: 12, color: colors.textSecondary, marginTop: -8 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  location: { fontSize: 18, fontWeight: '700', color: colors.text },
  zone: { fontSize: 12, color: colors.textSecondary },
  statusBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  statusText: { fontSize: 12, fontWeight: '600' },
  noteBox: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  noteText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailItem: {
    width: '47%',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.06)',
  },
  detailLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  actionRow: { flexDirection: 'row', gap: 10 },
  navigateBtn: { flex: 1 },
  navigateBtnInner: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    backgroundColor: colors.accentLight,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  navigateBtnText: { fontSize: 15, fontWeight: '700', color: colors.accent },
  collectBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  collectGradient: { borderRadius: 16, padding: 18, alignItems: 'center' },
  collectBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  howItWorks: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginTop: 14, lineHeight: 17, paddingHorizontal: 10 },

  // Photo preview
  previewTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  previewHint: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 16, lineHeight: 19 },
  previewImage: { width: '100%', aspectRatio: 3 / 4, borderRadius: 18, marginBottom: 16, backgroundColor: '#e5e7eb' },
  secondaryBtn: {
    flex: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: colors.text },
  cancelLink: { alignSelf: 'center', marginTop: 14, padding: 8 },
  cancelLinkText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
});
