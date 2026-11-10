import { Text } from 'react-native';

export default function GradientBrand({ fontSize = 20 }) {
  return (
    <Text
      style={{
        fontSize,
        fontWeight: '900',
        letterSpacing: 4,
        fontFamily: 'Orbitron_900Black',
        color: '#60a5fa',
      }}
    >
      ECOPULSE
    </Text>
  );
}
