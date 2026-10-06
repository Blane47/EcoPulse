import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { colors, gradients, shadows } from '../theme';
import { ArrowLeftIcon } from '../components/Icons';
import api from '../api/axios';
import { playSend, playReceive } from '../utils/sounds';

export default function ChatScreen({ navigation }) {
  const { user, language } = useAuth();
  const en = language === 'en';
  const locale = en ? 'en-GB' : 'fr-FR';
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const pollRef = useRef(null);

  const chatId = user?._id;

  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get(`/chat/${chatId}`);
      setMessages((prev) => {
        if (data.length > prev.length && data[data.length - 1]?.senderRole !== 'collector') {
          playReceive();
        }
        return data;
      });
      setLoadError(false);
      // Mark messages from admin as read (best-effort: the admin's unread badge catches up on the next poll)
      await api.put(`/chat/${chatId}/read`).catch(() => {});
      return true;
    } catch {
      // Polled every few seconds: a missed tick is retried on the next one
      return false;
    }
  }, [chatId]);

  // First load (and Retry): the only fetch whose failure is shown to the collector
  const loadMessages = useCallback(async () => {
    const ok = await fetchMessages();
    if (!ok) setLoadError(true);
  }, [fetchMessages]);

  useEffect(() => {
    const init = async () => {
      await loadMessages();
      setLoading(false);
    };
    init();

    // Poll every 4 seconds for new messages
    pollRef.current = setInterval(fetchMessages, 2000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages, loadMessages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const { data } = await api.post('/chat', { text: trimmed });
      setText('');
      setMessages((prev) => [...prev, data]);
      playSend();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      // Keep the typed text so the collector can send it again
      Alert.alert(
        en ? 'Message not sent' : 'Message non envoyé',
        en
          ? 'Your message could not be sent. Check your internet connection and try again.'
          : "Votre message n'a pas pu être envoyé. Vérifiez votre connexion internet et réessayez."
      );
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return en ? 'Today' : "Aujourd'hui";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return en ? 'Yesterday' : 'Hier';
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  };

  const renderMessage = ({ item, index }) => {
    const isMe = item.senderRole === 'collector';
    const showDate = index === 0 || formatDate(messages[index - 1].createdAt) !== formatDate(item.createdAt);

    return (
      <>
        {showDate && (
          <View style={styles.dateDivider}>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
        )}
        <View style={[styles.messageBubbleRow, isMe && styles.messageBubbleRowMe]}>
          <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
            {!isMe && <Text style={styles.senderLabel}>Admin</Text>}
            <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{item.text}</Text>
            <Text style={[styles.timeText, isMe && styles.timeTextMe]}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>
      </>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={gradients.screenBg} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <View style={styles.adminAvatar}>
            <Text style={styles.adminAvatarText}>A</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>{en ? 'Admin Support' : 'Assistance admin'}</Text>
            <Text style={styles.headerSubtitle}>{en ? 'EcoPulse HQ' : 'Siège EcoPulse'}</Text>
          </View>
        </View>
        <View style={styles.onlineDot} />
      </View>

      {/* Logo Watermark */}
      <View style={styles.watermarkContainer} pointerEvents="none">
        <Image source={require('../assets/images/logo.png')} style={styles.watermarkLogo} resizeMode="contain" />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            loadError ? (
              <View style={styles.emptyContainer}>
                <View style={styles.errorBox}>
                  <Text style={styles.errorTitle}>{en ? "Couldn't load messages" : 'Impossible de charger les messages'}</Text>
                  <Text style={styles.errorText}>
                    {en ? 'Check your internet connection and try again.' : 'Vérifiez votre connexion internet et réessayez.'}
                  </Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={loadMessages}>
                    <Text style={styles.retryText}>{en ? 'Retry' : 'Réessayer'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyTitle}>{en ? 'Start a conversation' : 'Démarrez une conversation'}</Text>
                <Text style={styles.emptySubtitle}>{en ? 'Send a message to your supervisor' : 'Envoyez un message à votre superviseur'}</Text>
              </View>
            )
          }
        />

        {/* Input */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={en ? 'Type a message...' : 'Écrivez un message...'}
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={1000}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            activeOpacity={0.7}
          >
            <LinearGradient colors={text.trim() ? gradients.greenButton : ['#d1d5db', '#d1d5db']} style={styles.sendGradient}>
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendIcon}>➤</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  watermarkContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  watermarkLogo: {
    width: 450,
    height: 450,
    opacity: 0.3,
  },
  flex: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 55,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backBtn: { marginRight: 12 },
  backText: { fontSize: 22, color: colors.accent, fontWeight: '600' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  adminAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  adminAvatarText: { fontSize: 16, fontWeight: '700', color: colors.accent },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 11, color: colors.textMuted },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: '#fff',
  },

  // Messages
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageBubbleRow: {
    flexDirection: 'row',
    marginBottom: 8,
    justifyContent: 'flex-start',
  },
  messageBubbleRowMe: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#fff',
  },
  timeText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeTextMe: {
    color: 'rgba(255,255,255,0.7)',
  },

  // Date divider
  dateDivider: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateText: {
    fontSize: 11,
    color: colors.textMuted,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
    fontWeight: '600',
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },

  // Load error
  errorBox: {
    marginHorizontal: 4,
    backgroundColor: colors.criticalLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 16,
    alignItems: 'center',
  },
  errorTitle: { fontSize: 14, fontWeight: '700', color: '#991b1b' },
  errorText: { fontSize: 12, color: '#b91c1c', textAlign: 'center', marginTop: 4, lineHeight: 17 },
  retryBtn: { marginTop: 12, backgroundColor: colors.critical, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 8 },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: 34,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  input: {
    fontSize: 15,
    color: colors.text,
    maxHeight: 80,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    fontSize: 20,
    color: '#fff',
    marginLeft: 2,
  },
});
