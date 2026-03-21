import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAuth } from '../context/AuthContext';
import { colors, shadows } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import RouteScreen from '../screens/RouteScreen';
import BinDetailScreen from '../screens/BinDetailScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabConfig = {
  Home: { icon: '🏠', label: 'HOME' },
  Route: { icon: '🚛', label: 'ROUTE' },
  Map: { icon: '🗺️', label: 'MAP' },
  Profile: { icon: '👤', label: 'PROFILE' },
};

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 32,
          }}>
            <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>{tabConfig[route.name]?.icon}</Text>
          </View>
        ),
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
          bottom: 16,
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
  const { authenticated, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {authenticated ? (
          <>
            <Stack.Screen name="MainTabs" component={HomeTabs} />
            <Stack.Screen
              name="BinDetail"
              component={BinDetailScreen}
              options={{
                headerShown: true,
                title: 'Bin Details',
                headerTintColor: colors.accent,
                headerStyle: { backgroundColor: '#eef5ee' },
                headerTitleStyle: { fontWeight: '700' },
              }}
            />
            <Stack.Screen name="Chat" component={ChatScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
