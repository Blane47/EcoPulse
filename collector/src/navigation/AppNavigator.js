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
import LeaveScreen from '../screens/LeaveScreen';
import OnDemandScreen from '../screens/OnDemandScreen';
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
              width: 48,
              height: 30,
              borderRadius: 15,
              backgroundColor: focused ? '#eff6ff' : 'transparent',
            }}>
              {Icon && <Icon size={22} color={focused ? '#2563eb' : '#94a3b8'} />}
            </View>
          );
        },
        tabBarLabel: ({ focused }) => (
          <Text style={{
            fontSize: 10,
            fontWeight: focused ? '700' : '500',
            color: focused ? '#2563eb' : '#94a3b8',
            letterSpacing: 0.4,
            marginTop: 1,
          }}>
            {en ? tabConfig[route.name]?.en : tabConfig[route.name]?.fr}
          </Text>
        ),
        tabBarStyle: {
          height: 66,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          backgroundColor: '#ffffff',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
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
            <Stack.Screen name="Leave" component={LeaveScreen} options={{ ...detailHeader, title: en ? 'Leave' : 'Congé' }} />
            <Stack.Screen name="OnDemand" component={OnDemandScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
      {authenticated && !user?.mustChangePassword && <NotificationBanner />}
    </NavigationContainer>
  );
}
