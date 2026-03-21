import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';
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
            width: 50,
            height: 34,
            borderRadius: 17,
            backgroundColor: focused ? 'rgba(34,197,94,0.15)' : 'transparent',
          }}>
            <Text style={{ fontSize: 19 }}>{tabConfig[route.name]?.icon}</Text>
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
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
          borderTopWidth: 0,
          backgroundColor: '#ffffff',
          ...shadows.bottom,
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
