import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image,
  ScrollView, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { colors, gradients, shadows } from '../theme';
import GradientBrand from '../components/GradientBrand';
import { playSuccess } from '../utils/sounds';

// Tighter header on short phones so the whole form fits without scrolling
const COMPACT = Dimensions.get('window').height < 720;
const looksLikeEmail = (text) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text.trim());

export default function LoginScreen() {
  const { login, language, selectLanguage } = useAuth();
  const en = language === 'en';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null); // 'email' | 'password'
  const passwordRef = useRef(null);

  const canSubmit = looksLikeEmail(email) && password.length > 0 && !loading;

  const handleLogin = async () => {
    setError('');
    if (!canSubmit) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
      playSuccess();
    } catch (err) {
      const status = err.response?.status;
      if (!err.response) {
        setError(en ? 'Could not reach the server. Check your internet connection.' : 'Impossible de joindre le serveur. Vérifiez votre connexion internet.');
      } else if (status === 401) {
        setError(en ? 'Wrong email or password. Try again.' : 'Email ou mot de passe incorrect. Réessayez.');
        setPassword('');
        passwordRef.current?.focus();
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
              {en
                ? 'Use the email from your collector application and your password.'
                : 'Utilisez l’email de votre candidature de collecteur et votre mot de passe.'}
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.field, focused === 'email' && styles.fieldFocused]}
              value={email}
              onChangeText={(t) => { setEmail(t); if (error) setError(''); }}
              placeholder={en ? 'you@example.com' : 'vous@exemple.com'}
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
            />

            <Text style={styles.label}>{en ? 'Password' : 'Mot de passe'}</Text>
            <View style={[styles.passwordField, focused === 'password' && styles.fieldFocused]}>
              <TextInput
                ref={passwordRef}
                style={styles.passwordInput}
                value={password}
                onChangeText={(t) => { setPassword(t); if (error) setError(''); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.showToggle}
                accessibilityLabel={showPassword ? (en ? 'Hide password' : 'Masquer le mot de passe') : (en ? 'Show password' : 'Afficher le mot de passe')}
              >
                <Text style={styles.showToggleText}>{showPassword ? (en ? 'Hide' : 'Masquer') : (en ? 'Show' : 'Afficher')}</Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleLogin}
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
            {en
              ? 'Forgot your password? Ask your supervisor for a new temporary one.'
              : 'Mot de passe oublié ? Demandez à votre superviseur un nouveau mot de passe temporaire.'}
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

  // Fields
  field: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
  },
  fieldFocused: { borderColor: colors.accent, backgroundColor: '#fff' },
  passwordField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  passwordInput: { flex: 1, height: '100%', paddingHorizontal: 14, fontSize: 16, color: colors.text },
  showToggle: { height: '100%', justifyContent: 'center', paddingHorizontal: 14 },
  showToggleText: { fontSize: 13, fontWeight: '700', color: colors.accentDark },

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
