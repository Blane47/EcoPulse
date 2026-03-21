import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { useZone } from '../context/ZoneContext';
import { colors } from '../theme';

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
  Schedule: { icon: '📅', label: 'SCHEDULE' },
  Collections: { icon: '🗑️', label: 'COLLECTIONS' },
  Chat: { icon: '💬', label: 'CHAT' },
  Reports: { icon: '📋', label: 'REPORTS' },
  Settings: { icon: '⚙️', label: 'SETTINGS' },
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
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 60, paddingHorizontal: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 24 }}>
        {en ? 'Settings' : 'Paramètres'}
      </Text>

      {/* Profile Section */}
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.5, marginBottom: 10 }}>
        {en ? 'YOUR PROFILE' : 'VOTRE PROFIL'}
      </Text>
      <View style={{
        backgroundColor: colors.card, borderRadius: 16, borderWidth: 1,
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
        backgroundColor: colors.card, borderRadius: 16, borderWidth: 1,
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
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
            📍 {en ? 'Change Zone' : 'Changer de Zone'}
          </Text>
          <Text
            style={{ fontSize: 14, fontWeight: '600', color: colors.accent }}
            onPress={clearZone}
          >
            {en ? 'Change' : 'Changer'}
          </Text>
        </View>
      </View>

      <Text style={{ textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 40 }}>
        EcoPulse Community v1.0
      </Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 32,
            borderRadius: 16,
            backgroundColor: focused ? colors.accentLight : 'transparent',
          }}>
            <Text style={{ fontSize: 18 }}>{tabConfig[route.name]?.icon}</Text>
          </View>
        ),
        tabBarLabel: ({ focused }) => (
          <Text style={{
            fontSize: 9,
            fontWeight: focused ? '700' : '500',
            color: focused ? colors.accent : colors.textMuted,
            letterSpacing: 0.5,
            marginTop: -2,
          }}>
            {tabConfig[route.name]?.label}
          </Text>
        ),
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
          borderTopColor: colors.cardBorder,
          borderTopWidth: 1,
          backgroundColor: '#fff',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
      })}
    >
      <Tab.Screen name="Schedule" component={HomeScreen} />
      <Tab.Screen name="Collections" component={ScheduleScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Reports" component={MyReportsScreen} />
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
            <Stack.Screen name="ReportBin" component={ReportBinScreen} options={{ headerShown: true, title: 'Report Bin', headerTintColor: colors.accent }} />
            <Stack.Screen name="Map" component={NearbyMapScreen} options={{ headerShown: true, title: 'Nearby Bins', headerTintColor: colors.accent }} />
          </>
        ) : (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
