import { Text } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

export default function GradientBrand({ fontSize = 22 }) {
  return (
    <MaskedView
      maskElement={
        <Text style={{
          fontFamily: 'Orbitron_900Black',
          fontSize,
          letterSpacing: 3,
          color: 'black',
        }}>
          ECOPULSE
        </Text>
      }
    >
      <LinearGradient
        colors={['#15803d', '#22c55e', '#4ade80']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={{
          fontFamily: 'Orbitron_900Black',
          fontSize,
          letterSpacing: 3,
          opacity: 0,
        }}>
          ECOPULSE
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}
