import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image,
  ScrollView, KeyboardAvoidingView, Platform, Pressable, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { colors, gradients, shadows } from '../theme';
import GradientBrand from '../components/GradientBrand';
import { playSuccess } from '../utils/sounds';

const PIN_LENGTH = 6;
const PHONE_DIGITS = 9; // Cameroon national number, entered after the fixed +237 prefix
// Tighter header on short phones so the whole form fits without scrolling
const COMPACT = Dimensions.get('window').height < 720;

// Keep only the 9 national digits (drops a pasted 237 / +237 prefix) and group them as 6XX XXX XXX
const toNationalDigits = (text) => {
  let digits = text.replace(/\D/g, '');
  if (digits.length > PHONE_DIGITS && digits.startsWith('237')) digits = digits.slice(3);
  return digits.slice(0, PHONE_DIGITS);
};
const formatPhone = (digits) => digits.replace(/(\d{3})(?=\d)/g, '$1 ');

export default function LoginScreen() {
  const { login, language, selectLanguage } = useAuth();
  const en = language === 'en';
  const [phone, setPhone] = useState(''); // national digits only
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null); // 'phone' | 'pin'
  const pinRef = useRef(null);

  const canSubmit = phone.length === PHONE_DIGITS && pin.length === PIN_LENGTH && !loading;

  const handleLogin = async (pinValue = pin) => {
    setError('');
    if (phone.length !== PHONE_DIGITS || pinValue.length !== PIN_LENGTH) {
      setError(en ? 'Enter your 9-digit phone number and 6-digit PIN.' : 'Saisissez votre numéro à 9 chiffres et votre PIN à 6 chiffres.');
      return;
    }
    setLoading(true);
    try {
      await login(`+237${phone}`, pinValue);
      playSuccess();
    } catch (err) {
      const status = err.response?.status;
      if (!err.response) {
        setError(en ? 'Could not reach the server. Check your internet connection.' : 'Impossible de joindre le serveur. Vérifiez votre connexion internet.');
      } else if (status === 401) {
        setError(en ? 'Wrong phone number or PIN. Try again.' : 'Numéro ou PIN incorrect. Réessayez.');
        setPin('');
        pinRef.current?.focus();
      } else if (status === 403) {
        setError(en
          ? 'Your account has been deactivated. Contact your supervisor.'
          : 'Votre compte a été désactivé. Contactez votre superviseur.');
      } else {
        setError(en ? err.response.data?.message || 'Login failed' : 'Échec de la connexion');
      }
    } finally {
      setLoading(false);
    }
  };

  const onPhoneChange = (text) => {
    const digits = toNationalDigits(text);
    setPhone(digits);
    if (error) setError('');
    if (digits.length === PHONE_DIGITS && phone.length < PHONE_DIGITS) pinRef.current?.focus();
  };

  const onPinChange = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setPin(digits);
    if (error) setError('');
    // Sign in as soon as the last digit is typed
    if (digits.length === PIN_LENGTH && phone.length === PHONE_DIGITS && !loading) handleLogin(digits);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
          {/* Brand header — same teal banner as the home screen */}
          <LinearGradient colors={['#0a2a3c', '#0f3d52', '#134b63']} style={styles.hero}>
            <View style={styles.langToggle}>
              {['en', 'fr'].map((lang) => (
                <TouchableOpacity
                  key={lang}
                  onPress={() => selectLanguage(lang)}
                  style={[styles.langOption, language === lang && styles.langOptionActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.langText, language === lang && styles.langTextActive]}>{lang.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.logoTile}>
              {/* logo.png is the mark + wordmark on white; show just the mark */}
              <Image source={require('../assets/images/logo.png')} style={styles.logoMark} />
            </View>
            <GradientBrand fontSize={24} />
            <Text style={styles.heroSubtitle}>{en ? 'COLLECTOR APP' : 'APPLICATION COLLECTEUR'}</Text>
          </LinearGradient>

          {/* Sign-in card */}
          <View style={styles.card}>
            <Text style={styles.title}>{en ? 'Sign in' : 'Connexion'}</Text>
            <Text style={styles.subtitle}>
              {en ? 'Use the phone number and PIN your supervisor gave you.' : 'Utilisez le numéro et le PIN fournis par votre superviseur.'}
            </Text>

            <Text style={styles.label}>{en ? 'Phone number' : 'Numéro de téléphone'}</Text>
            <View style={[styles.phoneField, focused === 'phone' && styles.fieldFocused]}>
              <View style={styles.prefix}>
                <Text style={styles.prefixText}>+237</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                value={formatPhone(phone)}
                onChangeText={onPhoneChange}
                placeholder="670 000 000"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                maxLength={PHONE_DIGITS + 4}
                returnKeyType="next"
                onSubmitEditing={() => pinRef.current?.focus()}
                onFocus={() => setFocused('phone')}
                onBlur={() => setFocused(null)}
              />
            </View>

            <Text style={styles.label}>PIN</Text>
            {/* Six boxes drawn over one invisible input, so the native number pad does the typing */}
            <Pressable style={styles.pinRow} onPress={() => pinRef.current?.focus()}>
              {Array.from({ length: PIN_LENGTH }).map((_, i) => {
                const filled = i < pin.length;
                const active = focused === 'pin' && (i === pin.length || (i === PIN_LENGTH - 1 && pin.length === PIN_LENGTH));
                return (
                  <View key={i} style={[styles.pinBox, filled && styles.pinBoxFilled, active && styles.pinBoxActive]}>
                    {filled && <View style={styles.pinDot} />}
                  </View>
                );
              })}
              <TextInput
                ref={pinRef}
                style={styles.hiddenInput}
                value={pin}
                onChangeText={onPinChange}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={PIN_LENGTH}
                secureTextEntry
                caretHidden
                onFocus={() => setFocused('pin')}
                onBlur={() => setFocused(null)}
                accessibilityLabel={en ? '6-digit PIN' : 'PIN à 6 chiffres'}
              />
            </Pressable>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={() => handleLogin()}
              disabled={!canSubmit}
              activeOpacity={0.85}
              style={[styles.button, !canSubmit && !loading && styles.buttonDisabled]}
            >
              <LinearGradient colors={gradients.greenButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buttonFill}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{en ? 'Sign in' : 'Se connecter'}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={styles.help}>
            {en ? 'Forgot your PIN? Ask your supervisor to set a new one.' : 'PIN oublié ? Demandez à votre superviseur d\'en définir un nouveau.'}
          </Text>
          <Text style={styles.footer}>{en ? 'EcoPulse · Buea Municipality' : 'EcoPulse · Commune de Buea'}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const LOGO_TILE = 84;
// The mark spans x 393-737, y 212-548 in the 1136×912 logo image; the wordmark starts at y 598.
// This scale/centre fills the tile with the mark and pushes the wordmark below the tile edge.
const MARK_SCALE = 0.205;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingBottom: 32 },

  // Header
  hero: {
    alignItems: 'center',
    paddingTop: COMPACT ? 44 : 64,
    paddingBottom: COMPACT ? 64 : 76,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  langToggle: {
    position: 'absolute',
    top: COMPACT ? 36 : 48,
    right: 20,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  langOption: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 13 },
  langOptionActive: { backgroundColor: '#fff' },
  langText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 },
  langTextActive: { color: '#0f3d52' },
  logoTile: {
    width: LOGO_TILE,
    height: LOGO_TILE,
    borderRadius: 24,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginTop: COMPACT ? 12 : 20,
    marginBottom: COMPACT ? 12 : 16,
    ...shadows.card,
  },
  logoMark: {
    position: 'absolute',
    width: 1136 * MARK_SCALE,
    height: 912 * MARK_SCALE,
    left: LOGO_TILE / 2 - 565 * MARK_SCALE,
    top: LOGO_TILE / 2 - 372 * MARK_SCALE,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.6)',
  },

  // Card
  card: {
    marginTop: -48,
    marginHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 22,
    ...shadows.card,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 19 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 20,
    marginBottom: 8,
  },

  // Phone
  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  fieldFocused: { borderColor: colors.accent, backgroundColor: '#fff' },
  prefix: {
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderRightColor: colors.cardBorder,
    backgroundColor: '#f1f5f9',
  },
  prefixText: { fontSize: 16, fontWeight: '600', color: colors.text },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 17,
    letterSpacing: 1,
    color: colors.text,
  },

  // PIN
  pinRow: { flexDirection: 'row', justifyContent: 'space-between' },
  pinBox: {
    width: '14.5%',
    aspectRatio: 0.85,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxFilled: { borderColor: '#86efac', backgroundColor: colors.accentLight },
  pinBoxActive: { borderColor: colors.accent, backgroundColor: '#fff' },
  pinDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accentDark },
  hiddenInput: { ...StyleSheet.absoluteFillObject, opacity: 0.02, color: 'transparent' },

  // Feedback + action
  errorBox: {
    marginTop: 16,
    backgroundColor: colors.criticalLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorText: { fontSize: 13, color: '#b91c1c', lineHeight: 18 },
  button: { marginTop: 22, borderRadius: 16, overflow: 'hidden' },
  buttonDisabled: { opacity: 0.45 },
  buttonFill: { height: 54, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

  help: {
    marginTop: 22,
    marginHorizontal: 32,
    textAlign: 'center',
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  footer: { marginTop: 8, textAlign: 'center', fontSize: 11, color: colors.textMuted },
});
