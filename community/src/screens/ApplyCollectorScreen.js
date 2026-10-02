import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { useZone } from '../context/ZoneContext';
import { colors } from '../theme';
import { CheckIcon } from '../components/Icons';
import TealHeader from '../components/TealHeader';
import api from '../api/axios';

const ZONES = ['Molyko', 'Great Soppo', 'Bonduma', 'Buea Town'];

export default function ApplyCollectorScreen({ navigation }) {
  const { profile, language } = useZone();
  const en = language === 'en';
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [zone, setZone] = useState('');
  const [hasLicense, setHasLicense] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !zone) {
      Alert.alert(en ? 'Missing fields' : 'Champs manquants', en ? 'Please fill in name, phone, and select a zone.' : 'Veuillez remplir le nom, le téléphone et sélectionner une zone.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/applications', {
        name: name.trim(),
        phone: phone.trim(),
        zone,
        hasLicense,
        motivation: motivation.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.message || (en ? 'Failed to submit' : 'Échec de l\'envoi');
      Alert.alert(en ? 'Error' : 'Erreur', msg);
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
          <Text style={styles.successTitle}>{en ? 'Application Submitted!' : 'Candidature Envoyée!'}</Text>
          <Text style={styles.successMessage}>
            {en
              ? 'Thank you for your interest in joining the EcoPulse collector team. The admin will review your application and notify you.'
              : 'Merci pour votre intérêt à rejoindre l\'équipe de collecteurs EcoPulse. L\'admin examinera votre candidature et vous informera.'}
          </Text>
          <TouchableOpacity style={styles.successButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.successButtonText}>{en ? 'Back to Settings' : 'Retour aux Paramètres'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 120 }}>
      <TealHeader
        title={en ? 'Become a Collector' : 'Devenir Collecteur'}
        subtitle={en ? 'Join the EcoPulse waste collection team' : 'Rejoignez l\'équipe de collecte EcoPulse'}
      />

      <View style={{ paddingHorizontal: 20 }}>
        {/* Name */}
        <Text style={styles.label}>{en ? 'FULL NAME' : 'NOM COMPLET'}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
          value={name}
          onChangeText={setName}
          placeholder={en ? 'Your full name' : 'Votre nom complet'}
          placeholderTextColor={colors.textMuted}
        />

        {/* Phone */}
        <Text style={styles.label}>{en ? 'PHONE NUMBER' : 'NUMÉRO DE TÉLÉPHONE'}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
          value={phone}
          onChangeText={setPhone}
          placeholder={en ? 'e.g. 670000001' : 'ex. 670000001'}
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
        />

        {/* Zone Preference */}
        <Text style={styles.label}>{en ? 'PREFERRED ZONE' : 'ZONE PRÉFÉRÉE'}</Text>
        <View style={styles.zoneGrid}>
          {ZONES.map((z) => (
            <TouchableOpacity
              key={z}
              style={[
                styles.zoneOption,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
                zone === z && { borderColor: colors.accent, backgroundColor: colors.accentLight },
              ]}
              onPress={() => setZone(z)}
              activeOpacity={0.7}
            >
              <Text style={[styles.zoneOptionText, { color: colors.text }, zone === z && { color: colors.accent, fontWeight: '700' }]}>
                {z}
              </Text>
              {zone === z && <CheckIcon size={14} color={colors.accent} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Driver's License */}
        <View style={[styles.licenseRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.licenseLabel, { color: colors.text }]}>
              {en ? 'Do you have a driver\'s license?' : 'Avez-vous un permis de conduire?'}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
              {en ? 'Required for truck operation' : 'Requis pour conduire un camion'}
            </Text>
          </View>
          <Switch
            value={hasLicense}
            onValueChange={setHasLicense}
            trackColor={{ false: colors.cardBorder, true: colors.accentLight }}
            thumbColor={hasLicense ? colors.accent : '#f4f3f4'}
          />
        </View>

        {/* Motivation */}
        <Text style={styles.label}>{en ? 'WHY DO YOU WANT TO JOIN?' : 'POURQUOI VOULEZ-VOUS NOUS REJOINDRE?'}</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.text }]}
          value={motivation}
          onChangeText={setMotivation}
          placeholder={en ? 'Tell us briefly why you want to be a collector...' : 'Dites-nous brièvement pourquoi vous voulez être collecteur...'}
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (!name.trim() || !phone.trim() || !zone || submitting) && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={!name.trim() || !phone.trim() || !zone || submitting}
          activeOpacity={0.8}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? (en ? 'Submitting...' : 'Envoi...') : (en ? 'Submit Application' : 'Envoyer la Candidature')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  zoneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  zoneOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '47%',
  },
  zoneOptionText: {
    fontSize: 14,
  },
  licenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  licenseLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
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
