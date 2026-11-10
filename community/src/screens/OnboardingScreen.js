import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useZone } from '../context/ZoneContext';
import { colors } from '../theme';
import { normalizePhone } from '../utils/phone';
import {
  AcademicCapIcon, ShoppingBagIcon, HomeIcon, MapPinIcon,
  GlobeIcon, UserIcon, LockIcon, CheckIcon, ArrowLeftIcon,
} from '../components/Icons';

const zones = [
  { name: 'Molyko', Icon: AcademicCapIcon, en: 'University area', fr: 'Zone universitaire' },
  { name: 'Great Soppo', Icon: ShoppingBagIcon, en: 'Commercial district', fr: 'Zone commerciale' },
  { name: 'Bonduma', Icon: HomeIcon, en: 'Residential area', fr: 'Zone résidentielle' },
  { name: 'Buea Town', Icon: MapPinIcon, en: 'Town center', fr: 'Centre-ville' },
];

export default function OnboardingScreen() {
  const { selectZone, registerProfile, profile, language, selectLanguage } = useZone();
  const [step, setStep] = useState(1); // 1 = zone, 2 = profile
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const en = language === 'en';

  const handleContinueToProfile = () => {
    if (!selected) return;
    // If user already has a profile, skip profile step — just select zone
    if (profile?.name && profile?.phone) {
      selectZone(selected);
      return;
    }
    setStep(2);
  };

  const handleFinish = async () => {
    if (!name.trim()) {
      Alert.alert(en ? 'Name required' : 'Nom requis');
      return;
    }
    if (!normalizePhone(phone)) {
      Alert.alert(
        en ? 'Valid phone number required' : 'Numéro de téléphone valide requis',
        en ? 'Enter your 9-digit number, e.g. 670 000 001.' : 'Entrez votre numéro à 9 chiffres, ex. 670 000 001.'
      );
      return;
    }

    setLoading(true);
    try {
      const data = await registerProfile({ name: name.trim(), phone, zone: selected });

      if (data.returning) {
        Alert.alert(
          en ? 'Welcome back!' : 'Bon retour!',
          en ? `Good to see you again, ${data.user.name}` : `Content de vous revoir, ${data.user.name}`
        );
      }

      await selectZone(selected);
    } catch (err) {
      if (err.response?.data?.code === 'PHONE_CLAIMED') {
        Alert.alert(
          en ? 'Number already registered' : 'Numéro déjà enregistré',
          en
            ? 'This number is already registered on another phone. Contact the municipality to move it to this phone.'
            : 'Ce numéro est déjà enregistré sur un autre téléphone. Contactez la mairie pour le transférer sur ce téléphone.'
        );
      } else if (err.response) {
        Alert.alert(en ? 'Could not register' : 'Inscription impossible', err.response.data?.message || '');
      } else {
        Alert.alert(
          en ? 'No connection' : 'Pas de connexion',
          en ? 'Could not reach EcoPulse. Check your internet connection and try again.' : 'Impossible de joindre EcoPulse. Vérifiez votre connexion internet et réessayez.'
        );
      }
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <LinearGradient colors={['rgba(37,99,235,0.3)', 'rgba(15,22,35,0.6)']} style={StyleSheet.absoluteFill} />
        <View style={styles.heroEmoji}>{step === 1 ? <GlobeIcon size={48} color="#fff" /> : <UserIcon size={48} color="#fff" />}</View>
        <Text style={styles.heroTitle}>
          {step === 1
            ? 'Keep Buea Clean / Gardons\nBuea Propre'
            : en ? 'Create Your Profile' : 'Créez Votre Profil'}
        </Text>
        {step === 2 && (
          <Text style={styles.heroSub}>
            {en ? 'So the admin knows who\'s reporting' : 'Pour que l\'admin sache qui signale'}
          </Text>
        )}
      </View>

      {step === 1 ? (
        <>
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {/* Language Toggle */}
            <TouchableOpacity
              style={[styles.langToggle, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
              onPress={() => selectLanguage(en ? 'fr' : 'en')}
            >
              <GlobeIcon size={14} color={colors.accent} />
              <Text style={styles.langToggleText}>{en ? 'FR' : 'EN'}</Text>
            </TouchableOpacity>

            {/* Select Zone */}
            <Text style={styles.selectTitle}>
              {en ? 'Select Your Zone' : 'Choisissez votre quartier'}
            </Text>

            {/* Zone Cards */}
            {zones.map((z) => (
              <TouchableOpacity
                key={z.name}
                style={[styles.zoneCard, selected === z.name && styles.zoneCardSelected]}
                onPress={() => setSelected(z.name)}
                activeOpacity={0.7}
              >
                <View style={styles.zoneIconContainer}>
                  <z.Icon size={24} color={colors.accent} />
                </View>
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneName}>{z.name}</Text>
                  <Text style={styles.zoneDesc}>{en ? z.en : z.fr}</Text>
                </View>
                {selected === z.name && (
                  <View style={styles.checkCircle}>
                    <CheckIcon size={16} color="#fff" strokeWidth={2.5} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Continue Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleContinueToProfile}
              disabled={!selected}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={selected ? ['#2563eb', '#1d4ed8'] : ['#d1d5db', '#9ca3af']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.continueButton}
              >
                <Text style={styles.continueText}>
                  {en ? 'Continue' : 'Continuer'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {/* Step indicator */}
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, styles.stepDotDone]} />
              <View style={[styles.stepLine, styles.stepLineDone]} />
              <View style={[styles.stepDot, styles.stepDotActive]} />
            </View>

            <Text style={styles.profileLabel}>{en ? 'YOUR NAME' : 'VOTRE NOM'}</Text>
            <TextInput
              style={styles.profileInput}
              placeholder={en ? 'e.g. Emmanuel Ngwa' : 'ex. Emmanuel Ngwa'}
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Text style={styles.profileLabel}>{en ? 'PHONE NUMBER' : 'NUMÉRO DE TÉLÉPHONE'}</Text>
            <TextInput
              style={styles.profileInput}
              placeholder={en ? 'e.g. 670 123 456' : 'ex. 670 123 456'}
              placeholderTextColor={colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.infoCard}>
              <LockIcon size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                {en
                  ? 'Your phone number is your unique ID. If you switch devices, just enter the same number to get your history back.'
                  : 'Votre numéro est votre identifiant unique. Si vous changez d\'appareil, entrez le même numéro pour retrouver votre historique.'}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerButtons}>
              <TouchableOpacity style={[styles.backBtn, { flexDirection: 'row', alignItems: 'center', gap: 6 }]} onPress={() => setStep(1)}>
                <ArrowLeftIcon size={16} color={colors.textSecondary} />
                <Text style={styles.backBtnText}>{en ? 'Back' : 'Retour'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={handleFinish}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#2563eb', '#1d4ed8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.continueButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.continueText}>
                      {en ? 'Get Started' : 'Commencer'}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Hero
  heroBanner: {
    height: 220,
    backgroundColor: '#2d6a4f',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 30,
  },
  heroEmoji: { fontSize: 50, marginBottom: 10 },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 30,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },

  // Content
  content: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 20 },

  langToggle: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accentLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
  },
  langToggleText: { fontSize: 13, fontWeight: '600', color: colors.accent },

  selectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    lineHeight: 22,
  },

  // Zone Cards
  zoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    padding: 16,
    marginBottom: 10,
  },
  zoneCardSelected: {
    borderColor: colors.accent,
    backgroundColor: '#eff6ff',
  },
  zoneIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  zoneIcon: { fontSize: 22 },
  zoneInfo: { flex: 1 },
  zoneName: { fontSize: 16, fontWeight: '700', color: colors.text },
  zoneDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Step indicator
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    gap: 0,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.cardBorder,
  },
  stepDotDone: { backgroundColor: colors.accent },
  stepDotActive: { backgroundColor: colors.accent, width: 14, height: 14, borderRadius: 7 },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.cardBorder,
  },
  stepLineDone: { backgroundColor: colors.accent },

  // Profile form
  profileLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  profileInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    backgroundColor: colors.card,
    marginBottom: 20,
    color: colors.text,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 14,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 10,
    backgroundColor: colors.background,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  continueButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
