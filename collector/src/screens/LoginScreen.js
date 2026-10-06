import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, Image, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { RecycleIcon } from '../components/Icons';
import { playSuccess } from '../utils/sounds';

const { width, height } = Dimensions.get('window');
const PIN_LENGTH = 6;
const PAD_SIZE = 62;

export default function LoginScreen() {
  const { login, language, selectLanguage } = useAuth();
  const en = language === 'en';
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!phone || pin.length < PIN_LENGTH) {
      setError(en ? 'Please enter phone and 6-digit PIN' : 'Saisissez votre téléphone et votre PIN à 6 chiffres');
      return;
    }
    setLoading(true);
    try {
      await login(phone, pin);
      playSuccess();
    } catch (err) {
      const status = err.response?.status;
      if (!err.response) {
        setError(en ? 'Could not reach the server. Check your internet connection.' : 'Impossible de joindre le serveur. Vérifiez votre connexion internet.');
      } else if (status === 401) {
        setError(en ? 'Invalid phone or PIN' : 'Téléphone ou PIN incorrect');
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

  const handlePadPress = (digit) => {
    if (pin.length < PIN_LENGTH) setPin((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <ImageBackground
      source={require('../assets/images/login-bg.png')}
      style={styles.container}
      resizeMode="cover"
      imageStyle={{ opacity: 0.5 }}
    >
      {/* Language — needed before signing in */}
      <View style={styles.langToggle}>
        {['en', 'fr'].map((lang, i) => (
          <View key={lang} style={styles.langItem}>
            {i > 0 && <Text style={styles.langDivider}>|</Text>}
            <TouchableOpacity onPress={() => selectLanguage(lang)} activeOpacity={0.6} hitSlop={8}>
              <Text style={[styles.langText, language === lang && styles.langTextActive]}>{lang.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Logo */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <Image source={require('../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
        </View>
        <Text style={styles.brand}>EcoPulse Go</Text>
        <Text style={styles.subtitle}>{en ? 'FIELD COLLECTOR PORTAL' : 'PORTAIL DU COLLECTEUR'}</Text>
      </View>

      {/* Phone Input */}
      <View style={styles.formSection}>
        <Text style={styles.label}>{en ? 'PHONE NUMBER' : 'NUMÉRO DE TÉLÉPHONE'}</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.phoneInput}
            placeholder="+237 670 000 000"
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* PIN */}
        <Text style={[styles.label, { textAlign: 'center' }]}>{en ? 'ENTER PIN' : 'SAISISSEZ VOTRE PIN'}</Text>
        <View style={styles.pinDotsRow}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View key={i} style={[styles.pinDot, i < pin.length && styles.pinDotFilled]} />
          ))}
        </View>
      </View>

      {/* Number Pad */}
      <View style={styles.padContainer}>
        {[[1, 2, 3], [4, 5, 6], [7, 8, 9]].map((row, ri) => (
          <View key={ri} style={styles.padRow}>
            {row.map((digit) => (
              <TouchableOpacity key={digit} style={styles.padButton} onPress={() => handlePadPress(String(digit))} activeOpacity={0.5}>
                <Text style={styles.padText}>{digit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={styles.padRow}>
          <View style={styles.padSpacer} />
          <TouchableOpacity style={styles.padButton} onPress={() => handlePadPress('0')} activeOpacity={0.5}>
            <Text style={styles.padText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.padButton} onPress={handleBackspace} activeOpacity={0.5}>
            <Text style={styles.padText}>⌫</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign In */}
      <View style={styles.bottomSection}>
        <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.8} style={{ width: '100%' }}>
          {loading ? (
            <View style={styles.loginLoading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <LinearGradient
              colors={['#3b9460', '#5ebf89']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginBtn}
            >
              <RecycleIcon size={26} color="#fff" strokeWidth={4} />
              <Text style={styles.loginBtnText}>{en ? 'Sign In' : 'Se connecter'}</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>

        <Text style={styles.footer}>
          {en ? 'Having trouble? ' : 'Un problème ? '}
          <Text style={styles.footerLink}>{en ? 'Contact your supervisor' : 'Contactez votre superviseur'}</Text>
        </Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
    paddingHorizontal: 30,
    paddingTop: height * 0.07,
    paddingBottom: 30,
  },

  // Language toggle
  langToggle: {
    position: 'absolute',
    top: 44,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  langItem: { flexDirection: 'row', alignItems: 'center' },
  langDivider: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginHorizontal: 8 },
  langText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
  langTextActive: { color: colors.accent, fontWeight: '800' },

  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoImage: {
    width: 52,
    height: 52,
    borderRadius: 18,
  },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 3,
    fontWeight: '500',
    marginTop: 5,
  },

  // Form
  formSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 18,
  },
  phoneInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
  },
  errorText: {
    color: colors.critical,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },

  // PIN
  pinDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginTop: 14,
    marginBottom: 10,
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  pinDotFilled: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 4,
  },

  // Number Pad
  padContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  padRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  padButton: {
    width: PAD_SIZE,
    height: PAD_SIZE,
    borderRadius: PAD_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  padSpacer: {
    width: PAD_SIZE,
    height: PAD_SIZE,
  },
  padText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#fff',
  },

  // Bottom
  bottomSection: {
    alignItems: 'center',
    paddingTop: 0,
    marginTop: -10,
  },
  loginBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loginBtnText: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  loginLoading: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 10,
  },
  footerLink: {
    color: 'rgba(255,255,255,0.7)',
    textDecorationLine: 'underline',
  },
});
