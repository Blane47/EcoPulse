import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator, Switch } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useZone } from '../context/ZoneContext';
import { colors } from '../theme';
import {
  MapPinIcon, CameraIcon, ArrowLeftIcon, CheckIcon, XMarkIcon, UserIcon,
  WarningIcon, InfoIcon, BellIcon, CheckBadgeIcon, ArrowRightIcon,
} from '../components/Icons';
import { CollectionIcon } from '../components/TabIcons';
import { shrinkPhoto } from '../utils/shrinkPhoto';
import api from '../api/axios';
import { playSuccess } from '../utils/sounds';

const BLUE = '#2563eb';

const CATEGORIES = [
  { key: 'bin', en: 'Overflowing bin', fr: 'Bac plein', subEn: 'Public municipal receptacle', subFr: 'Réceptacle municipal', Icon: CollectionIcon },
  { key: 'dump', en: 'Illegal dump', fr: 'Dépôt sauvage', subEn: 'Roadside or open land', subFr: 'Bord de route / terrain', Icon: WarningIcon },
];
const FILLS = [
  { key: 'getting_full', en: 'Getting full', fr: 'Se remplit', hintEn: '~75% full', hintFr: '~75%', color: '#f59e0b' },
  { key: 'full', en: 'Full', fr: 'Plein', hintEn: 'To the brim', hintFr: 'À ras bord', color: '#ea580c' },
  { key: 'overflowing', en: 'Overflowing', fr: 'Débordant', hintEn: 'Ground spill', hintFr: 'Déborde au sol', color: '#dc2626' },
];
const QUICK_TAGS = [
  { en: 'Blocking walkway', fr: 'Bloque le passage' },
  { en: 'Sharp waste', fr: 'Déchets coupants' },
  { en: 'Near school', fr: "Près d'une école" },
];

export default function ReportBinScreen({ navigation }) {
  const { zone, language } = useZone();
  const en = language === 'en';
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('bin');
  const [fill, setFill] = useState('overflowing');
  const [notify, setNotify] = useState(true);
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(true);
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(en ? 'Location Required' : 'Localisation Requise', en ? 'We need your location to pinpoint the waste pile.' : 'Nous avons besoin de votre position pour localiser le tas de déchets.');
        setLocating(false);
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {
        Alert.alert(en ? 'Could not get location' : "Impossible d'obtenir la position");
      }
      setLocating(false);
    })();
  }, []);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert(en ? 'Camera permission denied' : 'Permission caméra refusée'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
    if (result.canceled || !result.assets?.[0]) return;
    try { setPhoto(await shrinkPhoto(result.assets[0])); }
    catch { Alert.alert(en ? 'Photo problem' : 'Problème de photo', en ? 'Could not process the photo. Please try again.' : 'Impossible de traiter la photo.'); }
  };

  const appendTag = (text) => setNote((n) => (n.includes(text) ? n : n ? `${n}, ${text}` : text));

  const handleSubmit = async () => {
    if (!photo) { Alert.alert(en ? 'Photo required' : 'Photo requise', en ? 'Please take a photo of the waste pile.' : 'Veuillez prendre une photo.'); return; }
    if (!coords) { Alert.alert(en ? 'Location unavailable' : 'Position indisponible', en ? 'Could not determine your location.' : 'Impossible de déterminer votre position.'); return; }
    setSubmitting(true);
    const cat = CATEGORIES.find((c) => c.key === category);
    const fl = FILLS.find((f) => f.key === fill);
    const tag = `[${en ? cat.en : cat.fr} · ${en ? fl.en : fl.fr}]`;
    try {
      await api.post('/reports', {
        location: description || (en ? cat.en : cat.fr),
        note: note ? `${tag} ${note}` : tag,
        coordinates: coords,
        zone,
        photo: photo.dataUrl,
        notify,
      });
      setSubmitted(true);
      playSuccess();
    } catch (err) {
      Alert.alert(
        en ? 'Report not sent' : 'Signalement non envoyé',
        err.response ? (en ? 'EcoPulse could not accept your report. Please try again.' : "EcoPulse n'a pas pu accepter votre signalement.")
                      : (en ? 'No internet connection. Check your connection and tap Submit again.' : 'Pas de connexion internet. Réessayez.')
      );
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successCard}>
          <View style={styles.successIconCircle}><CheckIcon size={40} color="#fff" strokeWidth={2.5} /></View>
          <Text style={styles.successTitle}>{en ? 'Report Submitted!' : 'Signalement Envoyé!'}</Text>
          <Text style={styles.successMessage}>{en ? 'Dispatched to Buea Council Control Room & the nearest field driver. Thank you for keeping Buea clean.' : 'Envoyé au Conseil de Buea et au chauffeur le plus proche. Merci.'}</Text>
          <TouchableOpacity style={styles.successButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={styles.successButtonText}>{en ? 'Back to Home' : "Retour à l'accueil"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const Card = ({ icon, title, right, children }) => (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.rowTight}>{icon}<Text style={styles.cardTitle}>{title}</Text></View>
        {right}
      </View>
      {children}
    </View>
  );

  return (
    <View style={styles.screen}>
      {/* App bar */}
      <View style={styles.appBar}>
        <View style={styles.rowTight}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}><ArrowLeftIcon size={22} color={colors.text} /></TouchableOpacity>
          <Text style={styles.appBarTitle}>{en ? 'Report a Bin' : 'Signaler un Bac'}</Text>
        </View>
        <View style={styles.avatar}><UserIcon size={18} color="#fff" /></View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Civic banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}><CheckBadgeIcon size={18} color="#0369a1" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{en ? 'Civic Rapid Response' : 'Réponse Civique Rapide'}</Text>
            <Text style={styles.bannerBody}>{en ? `Help Buea Municipal Council & HYSACAM keep ${zone} clean by flagging public waste issues.` : `Aidez le Conseil de Buea & HYSACAM à garder ${zone} propre.`}</Text>
          </View>
        </View>

        {/* Photo */}
        <Card
          icon={<CameraIcon size={18} color={BLUE} />}
          title={en ? 'Photo of the issue' : "Photo du problème"}
          right={<View style={styles.countPill}><Text style={styles.countPillText}>{photo ? (en ? '1 added' : '1 ajoutée') : (en ? 'required' : 'requise')}</Text></View>}
        >
          {photo ? (
            <View style={{ marginTop: 10 }}>
              <Image source={{ uri: photo.uri }} style={styles.photo} />
              <View style={styles.photoActions}>
                <TouchableOpacity style={styles.retakeBtn} onPress={takePhoto}><CameraIcon size={15} color={BLUE} /><Text style={styles.retakeText}>{en ? 'Retake' : 'Reprendre'}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.retakeBtn, { borderColor: '#fca5a5' }]} onPress={() => setPhoto(null)}><XMarkIcon size={15} color={colors.critical} /><Text style={[styles.retakeText, { color: colors.critical }]}>{en ? 'Remove' : 'Retirer'}</Text></TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoSlot} onPress={takePhoto} activeOpacity={0.8}>
              <View style={styles.photoSlotIcon}><CameraIcon size={22} color={BLUE} /></View>
              <Text style={styles.photoSlotTitle}>{en ? 'Take a live photo' : 'Prendre une photo'}</Text>
              <Text style={styles.photoSlotSub}>{en ? 'Camera only — no gallery uploads' : 'Caméra uniquement'}</Text>
            </TouchableOpacity>
          )}
          <View style={styles.hintRow}><InfoIcon size={13} color={BLUE} /><Text style={styles.hintText}>{en ? 'A clear photo helps the hauler verify and prioritize.' : 'Une photo claire aide le collecteur à vérifier et prioriser.'}</Text></View>
        </Card>

        {/* Category */}
        <Card icon={<WarningIcon size={18} color={BLUE} />} title={en ? 'What are you reporting?' : 'Que signalez-vous ?'}>
          <View style={styles.optionGrid}>
            {CATEGORIES.map((c) => {
              const on = category === c.key;
              return (
                <TouchableOpacity key={c.key} style={[styles.option, on && styles.optionOn]} onPress={() => setCategory(c.key)} activeOpacity={0.85}>
                  <View style={styles.optionTop}>
                    <View style={[styles.optionIcon, on && { backgroundColor: BLUE }]}><c.Icon size={16} color={on ? '#fff' : colors.textSecondary} /></View>
                    {on && <CheckBadgeIcon size={18} color={BLUE} />}
                  </View>
                  <Text style={styles.optionTitle}>{en ? c.en : c.fr}</Text>
                  <Text style={styles.optionSub}>{en ? c.subEn : c.subFr}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Location */}
        <Card icon={<MapPinIcon size={18} color={BLUE} />} title={en ? 'Bin location' : 'Emplacement'}>
          <View style={styles.mapSnap}>
            <View style={styles.mapGps}><View style={styles.mapGpsPing} /><View style={styles.mapGpsDot} /></View>
            <View style={styles.gpsPill}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: coords ? '#22c55e' : '#f59e0b' }} />
              <Text style={styles.gpsPillText}>{locating ? (en ? 'Locating…' : 'Localisation…') : coords ? (en ? 'GPS Lock (±3m)' : 'GPS (±3m)') : (en ? 'No GPS' : 'Pas de GPS')}</Text>
            </View>
          </View>
          <Text style={styles.addrTitle}>{description || `${zone} ${en ? '· current position' : '· position actuelle'}`}</Text>
          {coords && <Text style={styles.addrCoords}>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</Text>}
          <TextInput style={styles.input} placeholder={en ? 'Landmark (e.g. near UB Junction)' : 'Repère (ex. près du Carrefour UB)'} placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} />
        </Card>

        {/* Fill level */}
        <Card icon={<View style={styles.fillBolt}><WarningIcon size={13} color={BLUE} /></View>} title={en ? 'Observed fill level' : 'Niveau de remplissage'}>
          <View style={styles.fillGrid}>
            {FILLS.map((f) => {
              const on = fill === f.key;
              return (
                <TouchableOpacity key={f.key} style={[styles.fillOpt, on && { borderColor: f.color, backgroundColor: `${f.color}14` }]} onPress={() => setFill(f.key)} activeOpacity={0.85}>
                  <View style={[styles.fillDot, { backgroundColor: f.color }]} />
                  <Text style={[styles.fillLabel, on && { color: f.color }]}>{en ? f.en : f.fr}</Text>
                  <Text style={styles.fillHint}>{en ? f.hintEn : f.hintFr}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Note */}
        <Card icon={<InfoIcon size={18} color={BLUE} />} title={en ? 'Add a note (optional)' : 'Note (facultatif)'} right={<Text style={styles.maxText}>Max 150</Text>}>
          <TextInput style={[styles.input, styles.textarea]} placeholder={en ? 'e.g. blocking sidewalk, strong smell, lid torn off…' : 'ex. bloque le trottoir, forte odeur…'} placeholderTextColor={colors.textMuted} value={note} onChangeText={setNote} multiline maxLength={150} />
          <View style={styles.tagRow}>
            {QUICK_TAGS.map((t) => (
              <TouchableOpacity key={t.en} style={styles.tagChip} onPress={() => appendTag(en ? t.en : t.fr)}><Text style={styles.tagText}>+ {en ? t.en : t.fr}</Text></TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Notify */}
        <View style={[styles.card, styles.rowBetween]}>
          <View style={[styles.rowTight, { flex: 1 }]}>
            <View style={styles.bannerIcon}><BellIcon size={18} color="#0369a1" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.notifyTitle}>{en ? 'Notify me when collected' : 'M\'avertir une fois collecté'}</Text>
              <Text style={styles.notifyBody}>{en ? 'Get an update once a truck clears this site.' : 'Recevez une mise à jour après le passage du camion.'}</Text>
            </View>
          </View>
          <Switch value={notify} onValueChange={setNotify} trackColor={{ false: colors.cardBorder, true: '#22c55e' }} thumbColor="#fff" />
        </View>

        {/* Submit */}
        <TouchableOpacity style={[styles.submitBtn, (!photo || !coords || submitting) && styles.submitBtnOff]} onPress={handleSubmit} disabled={!photo || !coords || submitting} activeOpacity={0.9}>
          {submitting ? <ActivityIndicator color="#fff" /> : (
            <View style={styles.rowTight}><Text style={styles.submitText}>{en ? 'Submit report' : 'Envoyer'}</Text><ArrowRightIcon size={16} color="#fff" /></View>
          )}
        </TouchableOpacity>
        <View style={[styles.rowTight, { justifyContent: 'center', marginTop: 10 }]}>
          <CheckBadgeIcon size={15} color="#0369a1" />
          <Text style={styles.assurance}>{en ? 'Dispatched to Buea Council Control Room & nearest field driver' : 'Envoyé au Conseil de Buea & au chauffeur le plus proche'}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  rowTight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  appBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eef2f9' },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  appBarTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },

  banner: { flexDirection: 'row', gap: 10, backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: 14, padding: 12, marginBottom: 12 },
  bannerIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 14, fontWeight: '800', color: '#0b1f3a' },
  bannerBody: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },

  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#eef2f9', padding: 14, marginBottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  countPill: { backgroundColor: '#eef2f9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countPillText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  maxText: { fontSize: 11, color: colors.textMuted },

  photo: { width: '100%', height: 180, borderRadius: 12 },
  photoActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  retakeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 10, paddingVertical: 9 },
  retakeText: { fontSize: 13, fontWeight: '700', color: BLUE },
  photoSlot: { marginTop: 10, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed', paddingVertical: 24, alignItems: 'center' },
  photoSlotIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  photoSlotTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  photoSlotSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  hintText: { fontSize: 11, color: colors.textSecondary, flex: 1 },

  optionGrid: { flexDirection: 'row', gap: 10, marginTop: 10 },
  option: { flex: 1, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#eef2f9', padding: 12 },
  optionOn: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  optionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  optionIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  optionSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  mapSnap: { height: 120, borderRadius: 12, backgroundColor: '#e7edf6', marginTop: 10, position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mapGps: { alignItems: 'center', justifyContent: 'center' },
  mapGpsPing: { position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(37,99,235,0.2)' },
  mapGpsDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: BLUE, borderWidth: 3, borderColor: '#fff' },
  gpsPill: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  gpsPillText: { fontSize: 11, fontWeight: '600', color: colors.text },
  addrTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 10 },
  addrCoords: { fontSize: 12, color: BLUE, fontWeight: '600', marginTop: 2 },

  fillBolt: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  fillGrid: { flexDirection: 'row', gap: 8, marginTop: 10 },
  fillOpt: { flex: 1, alignItems: 'center', borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#eef2f9', paddingVertical: 10 },
  fillDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 5 },
  fillLabel: { fontSize: 12, fontWeight: '700', color: colors.text },
  fillHint: { fontSize: 10, color: colors.textMuted, marginTop: 1 },

  input: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 12, fontSize: 14, color: colors.text, backgroundColor: '#f8fafc', marginTop: 10 },
  textarea: { height: 70, textAlignVertical: 'top' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tagChip: { backgroundColor: '#eef2f9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { fontSize: 12, fontWeight: '600', color: colors.text },

  notifyTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  notifyBody: { fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 15 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BLUE, borderRadius: 14, paddingVertical: 15, marginTop: 6 },
  submitBtnOff: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  assurance: { fontSize: 11, color: colors.textSecondary, flex: 1 },

  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: colors.background },
  successCard: { alignItems: 'center' },
  successIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 12 },
  successMessage: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 32 },
  successButton: { backgroundColor: BLUE, borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14 },
  successButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
