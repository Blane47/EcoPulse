import { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { notificationTitle, opensReport } from '../utils/notificationTitle';
import { navigate } from '../navigation/navigationRef';
import { BellIcon } from './Icons';

const VISIBLE_MS = 6000;

// Slides in from the top when a new notification arrives while the app is open
export default function NotificationBanner() {
  const { banner, dismissBanner, markRead } = useNotifications();
  const { language } = useAuth();
  const en = language === 'en';
  const translateY = useRef(new Animated.Value(-160)).current;

  useEffect(() => {
    if (!banner) return;
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    const timer = setTimeout(hide, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [banner]);

  function hide() {
    Animated.timing(translateY, { toValue: -160, duration: 200, useNativeDriver: true }).start(dismissBanner);
  }

  if (!banner) return null;

  const open = () => {
    markRead(banner._id);
    hide();
    if (opensReport(banner)) navigate('AssignedReport', { id: banner.report });
    else navigate('Notifications');
  };

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ translateY }] }]}>
      <TouchableOpacity style={styles.banner} onPress={open} activeOpacity={0.9}>
        <View style={styles.iconCircle}>
          <BellIcon size={18} color="#F59E0B" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{notificationTitle(banner, en)}</Text>
          {!!banner.body && <Text style={styles.body} numberOfLines={2}>{banner.body}</Text>}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    zIndex: 100,
    elevation: 20,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: '#fff' },
  body: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2, lineHeight: 16 },
});

