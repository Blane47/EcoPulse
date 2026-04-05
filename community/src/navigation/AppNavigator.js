import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TextInput, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useZone } from '../context/ZoneContext';
import api from '../api/axios';
import { colors } from '../theme';
import { HomeIcon, CalendarIcon, CollectionIcon, ChatIcon, ReportIcon, SettingsIcon } from '../components/TabIcons';
import { MapPinIcon } from '../components/Icons';
import TealHeader from '../components/TealHeader';

import { BlurView } from 'expo-blur';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import MyReportsScreen from '../screens/MyReportsScreen';
import ReportBinScreen from '../screens/ReportBinScreen';
import NearbyMapScreen from '../screens/NearbyMapScreen';
import ChatScreen from '../screens/ChatScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabConfig = {
  Schedule: { Icon: HomeIcon, label: 'HOME' },
  Collections: { Icon: CollectionIcon, label: 'COLLECTION' },
  Chat: { Icon: ChatIcon, label: 'CHAT' },
  Reports: { Icon: ReportIcon, label: 'REPORTS' },
  Settings: { Icon: SettingsIcon, label: 'SETTINGS' },
};

function SettingsPlaceholder() {
  const { clearZone, language, selectLanguage, profile, saveProfile } = useZone();
  const en = language === 'en';
  const [name, setName] = useState(profile?.name || '');
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(en ? 'Name required' : 'Nom requis');
      return;
    }
    saveProfile({ ...profile, name: name.trim() });
    setEditing(false);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 120 }}>
      <TealHeader title={en ? 'Settings' : 'Paramètres'} />

      <View style={{ paddingHorizontal: 20 }}>
        {/* Profile Section */}
        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.5, marginBottom: 10 }}>
          {en ? 'YOUR PROFILE' : 'VOTRE PROFIL'}
        </Text>
        <View style={{
          backgroundColor: colors.card, borderRadius: 20, borderWidth: 1,
          borderColor: colors.cardBorder, padding: 16, marginBottom: 20,
        }}>
          {editing ? (
            <>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 6 }}>
                {en ? 'Name' : 'Nom'}
              </Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 12, fontSize: 14, color: colors.text, backgroundColor: colors.background, marginBottom: 14 }}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Text
                  style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.textSecondary, textAlign: 'center', paddingVertical: 12 }}
                  onPress={() => { setName(profile?.name || ''); setEditing(false); }}
                >
                  {en ? 'Cancel' : 'Annuler'}
                </Text>
                <Text
                  style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#fff', textAlign: 'center', backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 12, overflow: 'hidden' }}
                  onPress={handleSave}
                >
                  {en ? 'Save' : 'Enregistrer'}
                </Text>
              </View>
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentLight, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.accent }}>{profile?.name?.charAt(0)?.toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{profile?.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{profile?.phone}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.accent }} onPress={() => setEditing(true)}>
                {en ? 'Edit' : 'Modifier'}
              </Text>
            </View>
          )}
        </View>

        {/* General Settings */}
        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.5, marginBottom: 10 }}>
          {en ? 'GENERAL' : 'GÉNÉRAL'}
        </Text>
        <View style={{
          backgroundColor: colors.card, borderRadius: 20, borderWidth: 1,
          borderColor: colors.cardBorder, overflow: 'hidden',
        }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
              🌐 {en ? 'Language' : 'Langue'}
            </Text>
            <Text
              style={{ fontSize: 14, fontWeight: '600', color: colors.accent }}
              onPress={() => selectLanguage(en ? 'fr' : 'en')}
            >
              {en ? 'Français' : 'English'}
            </Text>
          </View>

          <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MapPinIcon size={16} color={colors.text} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {en ? 'Change Zone' : 'Changer de Zone'}
              </Text>
            </View>
            <Text
              style={{ fontSize: 14, fontWeight: '600', color: colors.accent }}
              onPress={clearZone}
            >
              {en ? 'Change' : 'Changer'}
            </Text>
          </View>
        </View>

        {/* About Section */}
        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.5, marginBottom: 10, marginTop: 24 }}>
          {en ? 'ABOUT' : 'À PROPOS'}
        </Text>
        <View style={{
          backgroundColor: colors.card, borderRadius: 16, borderWidth: 1,
          borderColor: colors.cardBorder, padding: 20, alignItems: 'center',
        }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.accent, letterSpacing: 2 }}>ECOPULSE</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
            {en
              ? 'Smart waste management for Buea Municipality. Report bins, track collections, and keep your community clean.'
              : 'Gestion intelligente des déchets pour la Municipalité de Buea. Signalez les bacs, suivez les collectes et gardez votre communauté propre.'}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 12 }}>
            Community App v1.0
          </Text>
          <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
            Buea, Cameroon
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function MainTabs() {
  const { profile } = useZone();
  const [unreadChat, setUnreadChat] = useState(false);

  useEffect(() => {
    if (!profile?.phone) return;
    const check = async () => {
      try {
        const { data } = await api.get(`/community/chat/${profile.phone}/unread`);
        setUnreadChat(data.unread > 0);
      } catch {}
    };
    check();
    const interval = setInterval(check, 8000);
    return () => clearInterval(interval);
  }, [profile?.phone]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => {
          const { Icon } = tabConfig[route.name] || {};
          return (
          <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 32,
          }}>
            {Icon && <Icon size={22} color={focused ? '#fff' : 'rgba(255,255,255,0.5)'} />}
            {route.name === 'Chat' && unreadChat && (
              <View style={{
                position: 'absolute',
                top: 0,
                right: 4,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: '#ef4444',
                borderWidth: 1.5,
                borderColor: '#1a1a2e',
              }} />
            )}
          </View>
        );
        },
        tabBarLabel: ({ focused }) => (
          <Text style={{
            fontSize: 10,
            fontWeight: focused ? '700' : '500',
            color: focused ? '#fff' : 'rgba(255,255,255,0.5)',
            letterSpacing: 0.5,
            marginTop: -2,
          }}>
            {tabConfig[route.name]?.label}
          </Text>
        ),
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint="dark"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 32,
              overflow: 'hidden',
              backgroundColor: 'rgba(26, 26, 46, 0.75)',
            }}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 20,
          right: 20,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          borderRadius: 32,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
        },
      })}
    >
      <Tab.Screen name="Schedule" component={HomeScreen} />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('ChatFullScreen');
          },
        })}
      />
      <Tab.Screen name="Reports" component={MyReportsScreen} />
      <Tab.Screen name="Collections" component={ScheduleScreen} />
      <Tab.Screen name="Settings" component={SettingsPlaceholder} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { zone, loading } = useZone();

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {zone ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="ChatFullScreen" component={ChatScreen} />
            <Stack.Screen name="ReportBin" component={ReportBinScreen} />
            <Stack.Screen name="Map" component={NearbyMapScreen} />
          </>
        ) : (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
