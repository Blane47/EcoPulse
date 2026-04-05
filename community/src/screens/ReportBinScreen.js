import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useZone } from '../context/ZoneContext';
import { colors } from '../theme';
import api from '../api/axios';
import { MapPinIcon, CameraIcon, ArrowLeftIcon, CheckIcon } from '../components/Icons';
import TealHeader from '../components/TealHeader';

export default function ReportBinScreen({ navigation }) {
  const { zone, language, profile } = useZone();
  const en = language === 'en';
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(true);
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Auto-grab GPS on screen open
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          en ? 'Location Required' : 'Localisation Requise',
          en ? 'We need your location to pinpoint the waste pile.' : 'Nous avons besoin de votre position pour localiser le tas de déchets.'
        );
        setLocating(false);
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {
        Alert.alert(en ? 'Could not get location' : 'Impossible d\'obtenir la position');
      }
      setLocating(false);
    })();
  }, []);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(en ? 'Camera permission denied' : 'Permission caméra refusée');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      base64: true,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhoto(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!photo) {
      Alert.alert(en ? 'Photo required' : 'Photo requise', en ? 'Please take a photo of the waste pile.' : 'Veuillez prendre une photo du tas de déchets.');
      return;
    }
    if (!coords) {
      Alert.alert(en ? 'Location unavailable' : 'Position indisponible', en ? 'Could not determine your location.' : 'Impossible de déterminer votre position.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/reports', {
        location: description || (en ? 'Waste pile report' : 'Signalement de déchets'),
        note,
        coordinates: coords,
        zone,
        deviceId: profile?.phone || 'anonymous',
        reporterName: profile?.name || null,
        reporterPhone: profile?.phone || null,
        photo: photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : null,
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <View style={[styles.successContainer, { backgroundColor: colors.background }]}>
        <View style={styles.successCard}>
          <View style={styles.successIconCircle}>
            <CheckIcon size={40} color="#fff" strokeWidth={2.5} />
          </View>
          <Text style={styles.successTitle}>{en ? 'Report Submitted!' : 'Signalement Envoyé!'}</Text>
          <Text style={styles.successMessage}>
            {en ? 'Thank you for helping keep Buea clean. The admin will review your report shortly.' : 'Merci d\'aider à garder Buea propre. L\'admin examinera votre signalement sous peu.'}
          </Text>
          <TouchableOpacity
            style={styles.successButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.successButtonText}>{en ? 'Back to Home' : 'Retour à l\'accueil'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 120 }}>
      <TealHeader
        title={en ? 'Report Waste Pile' : 'Signaler un Tas de Déchets'}
        subtitle={en ? 'Snap a photo and we\'ll grab your location' : 'Prenez une photo et nous récupérons votre position'}
      />

      {/* Location Status */}
      <View style={[styles.locationCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.locationLeft}>
          <MapPinIcon size={20} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.locationTitle, { color: colors.text }]}>{en ? 'Your Location' : 'Votre Position'}</Text>
            {locating ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={[styles.locationStatus, { color: colors.textMuted }]}>{en ? 'Getting GPS...' : 'Localisation GPS...'}</Text>
              </View>
            ) : coords ? (
              <Text style={[styles.locationCoords, { color: colors.accent }]}>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</Text>
            ) : (
              <Text style={[styles.locationStatus, { color: colors.critical }]}>{en ? 'Unavailable' : 'Indisponible'}</Text>
            )}
          </View>
        </View>
        {coords && <Text style={[styles.locationCheck, { color: colors.accent }]}>✓</Text>}
      </View>

      {/* Photo Section */}
      <Text style={[styles.label, { color: colors.textMuted }]}>{en ? 'PHOTO EVIDENCE' : 'PREUVE PHOTO'}</Text>
      {photo ? (
        <View style={styles.photoPreviewContainer}>
          <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
          <View style={styles.photoActions}>
            <TouchableOpacity style={[styles.retakeBtn, { borderColor: colors.accent }]} onPress={takePhoto}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><CameraIcon size={16} color={colors.accent} /><Text style={[styles.retakeBtnText, { color: colors.accent }]}>{en ? 'Retake' : 'Reprendre'}</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.retakeBtn, { borderColor: colors.critical }]} onPress={() => setPhoto(null)}>
              <Text style={[styles.retakeBtnText, { color: colors.critical }]}>✕ {en ? 'Remove' : 'Supprimer'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={[styles.cameraBtn, { backgroundColor: colors.card, borderColor: colors.accent }]} onPress={takePhoto} activeOpacity={0.7}>
          <CameraIcon size={32} color={colors.accent} />
          <Text style={[styles.cameraBtnText, { color: colors.text }]}>{en ? 'Take Live Photo' : 'Prendre Photo en Direct'}</Text>
          <Text style={[styles.cameraBtnSub, { color: colors.textMuted }]}>{en ? 'Camera only — no gallery uploads' : 'Caméra uniquement — pas de téléchargement'}</Text>
        </TouchableOpacity>
      )}

      {/* Description */}
      <Text style={[styles.label, { color: colors.textMuted }]}>{en ? 'LOCATION DESCRIPTION (OPTIONAL)' : 'DESCRIPTION DU LIEU (OPTIONNEL)'}</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.cardBorder, backgroundColor: colors.card, color: colors.text }]}
        placeholder={en ? 'e.g. Behind UB Junction, near the market' : 'ex. Derrière le Carrefour UB, près du marché'}
        placeholderTextColor={colors.textMuted}
        value={description}
        onChangeText={setDescription}
      />

      <Text style={[styles.label, { color: colors.textMuted }]}>{en ? 'ADDITIONAL NOTES (OPTIONAL)' : 'NOTES SUPPLÉMENTAIRES (OPTIONNEL)'}  </Text>
      <TextInput
        style={[styles.input, styles.textarea, { borderColor: colors.cardBorder, backgroundColor: colors.card, color: colors.text }]}
        placeholder={en ? 'e.g. Been here for 3 days, very smelly' : 'ex. Là depuis 3 jours, très malodorant'}
        placeholderTextColor={colors.textMuted}
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={3}
      />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, (!photo || !coords || submitting) && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={!photo || !coords || submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>
            {en ? '📤 Submit Report' : '📤 Envoyer le Signalement'}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={[styles.footerNote, { color: colors.textMuted }]}>
        {en
          ? 'Your GPS location will be sent with the photo so the admin can locate the exact spot.'
          : 'Votre position GPS sera envoyée avec la photo pour que l\'admin puisse localiser l\'endroit exact.'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 20 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 19 },

  // Location card
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  locationLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  locationTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  locationCoords: { fontSize: 12, color: colors.accent, marginTop: 2, fontWeight: '600' },
  locationStatus: { fontSize: 12, color: colors.textMuted },
  locationCheck: { fontSize: 18, color: colors.accent, fontWeight: '700' },

  // Labels
  label: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: 8 },

  // Photo
  cameraBtn: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.accent,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  cameraBtnText: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 8 },
  cameraBtnSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  photoPreviewContainer: { marginBottom: 20 },
  photoPreview: { width: '100%', height: 200, borderRadius: 14, marginBottom: 10 },
  photoActions: { flexDirection: 'row', gap: 10 },
  retakeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  retakeBtnText: { fontSize: 13, fontWeight: '600', color: colors.accent },

  // Inputs
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    backgroundColor: colors.card,
    marginBottom: 16,
    color: colors.text,
  },
  textarea: { height: 80, textAlignVertical: 'top' },

  // Submit
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  footerNote: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
    paddingHorizontal: 10,
  },

  // Success Screen
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successCard: {
    alignItems: 'center',
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 32,
  },
  successButton: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
