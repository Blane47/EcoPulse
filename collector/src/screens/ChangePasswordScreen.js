import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { colors, gradients, shadows } from '../theme';

const MIN_LENGTH = 8;

// Two uses: forced after signing in with a temporary password from an admin (no way past
// except choosing a password or signing out), and "Change password" from the profile.
export default function ChangePasswordScreen({ navigation }) {
  const { user, tempPassword, changePassword, logout, language } = useAuth();
  const en = language === 'en';
  const forced = !!user?.mustChangePassword;
  // After a fresh sign-in the temporary password is already known; after an app restart it isn't
  const needsCurrent = !(forced && tempPassword);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    if (next.length < MIN_LENGTH) {
      setError(en ? `Use at least ${MIN_LENGTH} characters.` : `Utilisez au moins ${MIN_LENGTH} caractères.`);
      return;
    }
    if (next !== confirm) {
      setError(en ? 'The two passwords don’t match.' : 'Les deux mots de passe ne correspondent pas.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(needsCurrent ? current : tempPassword, next);
      if (!forced) {
        Alert.alert(en ? 'Password changed' : 'Mot de passe modifié');
        navigation.goBack();
      }
      // When forced, clearing mustChangePassword swaps the navigator to the app
    } catch (err) {
      if (!err.response) {
        setError(en ? 'Could not reach the server. Check your internet connection.' : 'Impossible de joindre le serveur. Vérifiez votre connexion internet.');
      } else if (err.response.data?.message === 'Current password is incorrect') {
        setError(en ? 'Your current password is incorrect.' : 'Votre mot de passe actuel est incorrect.');
      } else if (err.response.data?.message?.startsWith('Choose a password different')) {
        setError(en ? 'Choose a password different from the temporary one.' : 'Choisissez un mot de passe différent du mot de passe temporaire.');
      } else {
        setError(en ? err.response.data?.message || 'Could not change the password.' : 'Impossible de modifier le mot de passe.');
      }
    }
    setSaving(false);
  };

  const field = (label, value, onChange, props = {}) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(t) => { onChange(t); if (error) setError(''); }}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
    </>
  );

  return (
    <LinearGradient colors={gradients.screenBg} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, forced && { paddingTop: 72 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>{forced ? (en ? 'Choose your password' : 'Choisissez votre mot de passe') : (en ? 'Change password' : 'Modifier le mot de passe')}</Text>
            <Text style={styles.subtitle}>
              {forced
                ? (en
                  ? `Welcome${user?.name ? `, ${user.name.split(' ')[0]}` : ''}! You signed in with a temporary password. Choose your own to continue — only you should know it.`
                  : `Bienvenue${user?.name ? `, ${user.name.split(' ')[0]}` : ''} ! Vous vous êtes connecté avec un mot de passe temporaire. Choisissez le vôtre pour continuer — vous seul devez le connaître.`)
                : (en ? 'Enter your current password, then the new one.' : 'Saisissez votre mot de passe actuel, puis le nouveau.')}
            </Text>

            {needsCurrent && field(
              forced ? (en ? 'Temporary password' : 'Mot de passe temporaire') : (en ? 'Current password' : 'Mot de passe actuel'),
              current, setCurrent, { autoComplete: 'password', textContentType: 'password' }
            )}
            {field(en ? 'New password' : 'Nouveau mot de passe', next, setNext, { autoComplete: 'password-new', textContentType: 'newPassword' })}
            <Text style={styles.hint}>{en ? `At least ${MIN_LENGTH} characters.` : `Au moins ${MIN_LENGTH} caractères.`}</Text>
            {field(en ? 'Confirm new password' : 'Confirmez le nouveau mot de passe', confirm, setConfirm, {
              autoComplete: 'password-new', textContentType: 'newPassword', returnKeyType: 'done', onSubmitEditing: save,
            })}

            <TouchableOpacity onPress={() => setShow((v) => !v)} style={styles.showToggle}>
              <Text style={styles.showToggleText}>{show ? (en ? 'Hide passwords' : 'Masquer') : (en ? 'Show passwords' : 'Afficher')}</Text>
            </TouchableOpacity>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.85} style={styles.button}>
              <LinearGradient colors={gradients.greenButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buttonFill}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{en ? 'Save password' : 'Enregistrer'}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {forced && (
            <TouchableOpacity onPress={logout} style={styles.signOut}>
              <Text style={styles.signOutText}>{en ? 'Sign out' : 'Se déconnecter'}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 22,
    ...shadows.card,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 19 },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 18, marginBottom: 8 },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
  },
  hint: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  showToggle: { alignSelf: 'flex-start', marginTop: 12, paddingVertical: 4 },
  showToggleText: { fontSize: 13, fontWeight: '700', color: colors.accentDark },
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
  buttonFill: { height: 54, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  signOut: { alignSelf: 'center', marginTop: 18, padding: 10 },
  signOutText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
});
