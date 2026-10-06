import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { notificationTitle, opensReport } from '../utils/notificationTitle';
import { colors, gradients, shadows } from '../theme';
import { BellIcon } from '../components/Icons';

function timeAgo(dateStr, en) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return en ? 'Just now' : "À l'instant";
  if (mins < 60) return en ? `${mins}m ago` : `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return en ? `${hrs}h ago` : `il y a ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return en ? `${days}d ago` : `il y a ${days} j`;
}

export default function NotificationsScreen({ navigation }) {
  const { notifications, unread, refresh, markRead, markAllRead } = useNotifications();
  const { language } = useAuth();
  const en = language === 'en';
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        unread > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAll}>{en ? 'Mark all read' : 'Tout marquer comme lu'}</Text>
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, unread, markAllRead, en]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const open = (item) => {
    if (!item.read) markRead(item._id);
    if (opensReport(item)) {
      navigation.navigate('AssignedReport', { id: item.report });
    }
  };

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <BellIcon size={36} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>{en ? 'No notifications yet' : 'Aucune notification pour le moment'}</Text>
            <Text style={styles.emptyText}>
              {en
                ? 'Reports assigned to you by the admin will appear here.'
                : "Les signalements que l'admin vous assigne apparaîtront ici."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.read && styles.cardUnread]}
            onPress={() => open(item)}
            activeOpacity={0.7}
          >
            <View style={styles.cardTop}>
              <Text style={styles.title} numberOfLines={1}>{notificationTitle(item, en)}</Text>
              {!item.read && <View style={styles.dot} />}
            </View>
            {!!item.body && <Text style={styles.body}>{item.body}</Text>}
            <Text style={styles.time}>{timeAgo(item.createdAt, en)}</Text>
          </TouchableOpacity>
        )}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  markAll: { fontSize: 13, fontWeight: '600', color: colors.accent },
  card: {
    backgroundColor: colors.cardGlass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.08)',
    padding: 16,
    marginBottom: 10,
    ...shadows.card,
  },
  cardUnread: { borderColor: colors.accent, backgroundColor: '#fff' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  body: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  time: { fontSize: 11, color: colors.textMuted, marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 12 },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 19 },
});
