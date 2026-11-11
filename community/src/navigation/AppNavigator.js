import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, TextInput, Alert, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useZone } from '../context/ZoneContext';
import api from '../api/axios';
import { colors } from '../theme';
import { HomeIcon, WarningIcon, TruckIcon, ChatBubbleIcon, UserIcon, MapPinIcon, LogoutIcon, GlobeIcon } from '../components/Icons';
import TealHeader from '../components/TealHeader';

import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import MyReportsScreen from '../screens/MyReportsScreen';
import ReportBinScreen from '../screens/ReportBinScreen';
import NearbyMapScreen from '../screens/NearbyMapScreen';
import ChatScreen from '../screens/ChatScreen';
import ApplyCollectorScreen from '../screens/ApplyCollectorScreen';
import OperatorsScreen from '../screens/OperatorsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const BLUE = '#2563eb';
const tabConfig = {
  Home: { Icon: HomeIcon, label: 'Home' },
  Report: { Icon: WarningIcon, label: 'Report' },
  Pickup: { Icon: TruckIcon, label: 'Pickup' },
  Chat: { Icon: ChatBubbleIcon, label: 'Chat' },
  Profile: { Icon: UserIcon, label: 'Profile' },
};

function EmptyTab() { return <View style={{ flex: 1, backgroundColor: colors.background }} />; }

function MainTabs() {
  const { profile } = useZone();
  const [unreadChat, setUnreadChat] = useState(false);

  useEffect(() => {
    if (!profile?.phone) return;
    const check = async () => {
      try {
        const { data } = await api.get('/community/chat/unread');
        setUnreadChat(data.unread > 0);
      } catch {
        // Badge check runs every 8s; stay silent and retry on the next tick
      }
    };
    check();
    const interval = setInterval(check, 8000);
    return () => clearInterval(interval);
  }, [profile?.phone]);

  return (
    <Tab.Navigator
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => {
          const { Icon, label } = tabConfig[route.name] || {};
          const tint = focused ? BLUE : '#64748b';
          return (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 12,
              minWidth: 56,
              backgroundColor: focused ? '#eff6ff' : 'transparent',
            }}>
              <View>
                {Icon && <Icon size={22} color={tint} strokeWidth={focused ? 2 : 1.6} />}
                {route.name === 'Chat' && unreadChat && (
                  <View style={{
                    position: 'absolute', top: -2, right: -4,
                    width: 9, height: 9, borderRadius: 5,
                    backgroundColor: '#ef4444', borderWidth: 1.5, borderColor: '#fff',
                  }} />
                )}
              </View>
              <Text style={{ fontSize: 11, fontWeight: focused ? '700' : '500', color: tint, marginTop: 2 }}>
                {label}
              </Text>
            </View>
          );
        },
        tabBarStyle: {
          height: 66,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#eef2f9',
          backgroundColor: '#fff',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Report"
        component={EmptyTab}
        listeners={({ navigation }) => ({
          tabPress: (e) => { e.preventDefault(); navigation.navigate('ReportBin'); },
        })}
      />
      <Tab.Screen name="Pickup" component={OperatorsScreen} />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        listeners={({ navigation }) => ({
          tabPress: (e) => { e.preventDefault(); navigation.navigate('ChatFullScreen'); },
        })}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
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
            <Stack.Screen name="ApplyCollector" component={ApplyCollectorScreen} />
            <Stack.Screen name="Reports" component={MyReportsScreen} />
            <Stack.Screen name="Collections" component={ScheduleScreen} />
          </>
        ) : (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
