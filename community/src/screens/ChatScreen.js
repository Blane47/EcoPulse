import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Image,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useZone } from '../context/ZoneContext';
import { colors } from '../theme';
import api from '../api/axios';
import { ArrowLeftIcon } from '../components/Icons';
import { ChatIcon } from '../components/TabIcons';

export default function ChatScreen() {
  const { profile, language } = useZone();
  const en = language === 'en';
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const pollRef = useRef(null);

  const fetchMessages = async () => {
    if (!profile?.phone) return;
    try {
      const { data } = await api.get(`/community/chat/${profile.phone}`);
      setMessages(data);
      // Mark admin messages as read
      await api.put(`/community/chat/${profile.phone}/read`);
    } catch {
      // offline
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
    // Poll every 5 seconds
    pollRef.current = setInterval(fetchMessages, 2000);
    return () => clearInterval(pollRef.current);
  }, [profile?.phone]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const { data } = await api.post('/community/chat', {
        phone: profile.phone,
        name: profile.name,
        text: text.trim(),
      });
      setMessages((prev) => [...prev, data]);
      setText('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      // offline
    }
    setSending(false);
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return en ? 'Today' : "Aujourd'hui";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return en ? 'Yesterday' : 'Hier';
    return d.toLocaleDateString();
  };

  const renderMessage = ({ item, index }) => {
    const isMe = item.senderRole === 'community';
    const showDate = index === 0 ||
      new Date(item.createdAt).toDateString() !== new Date(messages[index - 1]?.createdAt).toDateString();

    return (
      <>
        {showDate && (
          <View style={styles.dateBadge}>
            <Text style={[styles.dateBadgeText, { color: colors.textMuted, backgroundColor: colors.card }]}>{formatDate(item.createdAt)}</Text>
          </View>
        )}
        <View style={[styles.messageBubble, isMe ? [styles.myBubble, { backgroundColor: colors.accent }] : [styles.theirBubble, { backgroundColor: colors.card, borderColor: colors.cardBorder }]]}>
          {!isMe && <Text style={[styles.senderName, { color: colors.accent }]}>Admin</Text>}
          <Text style={[styles.messageText, { color: colors.text }, isMe && styles.myMessageText]}>{item.text}</Text>
          <Text style={[styles.messageTime, { color: colors.textMuted }, isMe && styles.myMessageTime]}>{formatTime(item.createdAt)}</Text>
        </View>
      </>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
        <View style={[styles.headerAvatar, { backgroundColor: colors.accentLight }]}>
          <Text style={{ fontSize: 18 }}>🛡️</Text>
        </View>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{en ? 'Admin Support' : 'Support Admin'}</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>{en ? 'Usually replies within an hour' : 'Répond généralement dans l\'heure'}</Text>
        </View>
      </View>

      {/* Logo Watermark */}
      <View style={styles.watermarkContainer} pointerEvents="none">
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.watermarkLogo}
          resizeMode="contain"
        />
      </View>

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={{ marginBottom: 12 }}><ChatIcon size={40} color={colors.textMuted} /></View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{en ? 'Start a conversation' : 'Démarrez une conversation'}</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            {en
              ? 'Report issues, ask questions, or give feedback to the city admin.'
              : 'Signalez des problèmes, posez des questions ou donnez votre avis à l\'admin.'}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input */}
      <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.cardBorder }]}
          placeholder={en ? 'Type a message...' : 'Tapez un message...'}
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendBtnText}>↑</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  watermarkContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  watermarkLogo: {
    width: 450,
    height: 450,
    opacity: 0.3,
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

  // Messages
  messagesList: { padding: 16, paddingBottom: 10 },

  dateBadge: { alignItems: 'center', marginVertical: 12 },
  dateBadgeText: {
    fontSize: 11,
    color: colors.textMuted,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },

  messageBubble: {
    maxWidth: '78%',
    borderRadius: 18,
    padding: 12,
    paddingBottom: 6,
    marginBottom: 6,
  },
  myBubble: {
    backgroundColor: colors.accent,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: colors.card,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 2,
  },
  messageText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  myMessageText: { color: '#fff' },
  messageTime: { fontSize: 10, color: colors.textMuted, alignSelf: 'flex-end', marginTop: 4 },
  myMessageTime: { color: 'rgba(255,255,255,0.7)' },

  // Empty
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingBottom: 34,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
