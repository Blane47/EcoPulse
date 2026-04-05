import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import GradientBrand from './GradientBrand';

export default function TealHeader({ title, subtitle, rightElement, children }) {
  return (
    <LinearGradient
      colors={['#0a2a3c', '#0f3d52', '#134b63']}
      style={styles.banner}
    >
      <View style={styles.header}>
        <GradientBrand fontSize={20} />
        {rightElement}
      </View>
      {title && <Text style={styles.title}>{title}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingTop: 28,
    paddingBottom: 24,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    marginBottom: 20,
    minHeight: 130,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 20,
    marginTop: 2,
  },
});
