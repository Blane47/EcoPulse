import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, shadows } from '../theme';
import { HomeIcon, RouteIcon, MapIcon, ProfileIcon } from '../components/TabIcons';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import RouteScreen from '../screens/RouteScreen';
import BinDetailScreen from '../screens/BinDetailScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AssignedReportScreen from '../screens/AssignedReportScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import NotificationBanner from '../components/NotificationBanner';
import { navigationRef } from './navigationRef';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabConfig = {
  Home: { Icon: HomeIcon, en: 'HOME', fr: 'ACCUEIL' },
  Route: { Icon: RouteIcon, en: 'ROUTE', fr: 'ITINÉRAIRE' },
  Map: { Icon: MapIcon, en: 'MAP', fr: 'CARTE' },
  Profile: { Icon: ProfileIcon, en: 'PROFILE', fr: 'PROFIL' },
};

function HomeTabs() {
  const { language } = useAuth();
  const en = language === 'en';

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
            {en ? tabConfig[route.name]?.en : tabConfig[route.name]?.fr}
          </Text>
        ),
        tabBarBackground: () => (
          <View
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: 32,
              backgroundColor: '#1a1a2e',
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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Route" component={RouteScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { authenticated, loading, language, user } = useAuth();
  const en = language === 'en';

  if (loading) return null;

  const detailHeader = {
    headerShown: true,
    headerTintColor: colors.accent,
    headerStyle: { backgroundColor: '#eef5ee' },
    headerTitleStyle: { fontWeight: '700' },
  };

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {authenticated && user?.mustChangePassword ? (
          // Signed in with a temporary password from an admin: nothing else until it's replaced
          <Stack.Screen name="ChooseYourPassword" component={ChangePasswordScreen} />
        ) : authenticated ? (
          <>
            <Stack.Screen name="MainTabs" component={HomeTabs} />
            <Stack.Screen name="BinDetail" component={BinDetailScreen} options={{ ...detailHeader, title: en ? 'Bin Details' : 'Détails du bac' }} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ ...detailHeader, title: 'Notifications' }} />
            <Stack.Screen name="AssignedReport" component={AssignedReportScreen} options={{ ...detailHeader, title: en ? 'Assigned Report' : 'Signalement assigné' }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ ...detailHeader, title: en ? 'Password' : 'Mot de passe' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
      {authenticated && !user?.mustChangePassword && <NotificationBanner />}
    </NavigationContainer>
  );
}
