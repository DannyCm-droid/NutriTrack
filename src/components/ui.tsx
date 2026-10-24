import { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/palette';

// Datos que recibe Screen. children es lo que va dentro de la pantalla.
// scroll permite bajar. keyboard aparta el contenido cuando se abre el teclado.
// centered lo pone al centro. edges elige qué bordes respetan la zona del teléfono.
type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  keyboard?: boolean;
  centered?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
};

// Si scroll es true, el contenido se puede deslizar. Si es false, queda fijo.
// keyboardShouldPersistTaps handled deja tocar botones aunque el teclado siga abierto.
// En iPhone el teclado empuja la pantalla. En Android este ajuste no se aplica.
export function Screen({
  children,
  scroll = false,
  keyboard = false,
  centered = false,
  edges = ['top'],
}: ScreenProps) {
  let content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scroll, centered && styles.centered]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.body}>{children}</View>
  );

  if (keyboard) {
    content = (
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {content}
    </SafeAreaView>
  );
}

// Círculo de espera en el centro. Las pantallas lo usan mientras llegan la sesión o los datos.
export function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.green} size="large" />
    </View>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  multiline?: boolean;
};

// Campo con su etiqueta. value y onChangeText los controla la pantalla que lo usa.
// secureTextEntry oculta lo que se escribe, como una contraseña.
// multiline agranda el campo para una descripción. La corrección automática está apagada.
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize = 'sentences',
  multiline = false,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
};

// Botón. Si loading o disabled están activos, no se puede pulsar.
// Mientras carga, muestra un círculo en lugar del texto.
// primary es verde, secondary es blanco y danger es rojo.
export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: ButtonProps) {
  const inactive = disabled || loading;
  const lightText = variant !== 'secondary';

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'danger' && styles.dangerButton,
        pressed && !inactive && styles.pressed,
        inactive && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={lightText ? colors.white : colors.green} />
      ) : (
        <Text style={[styles.buttonText, variant === 'secondary' && styles.secondaryText]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

// Caja blanca para agrupar un bloque, como una comida o un resumen.
export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

// Barra de avance. value es lo que llevas y max es la meta.
// Nunca pasa del ancho completo. Si max es cero o negativo, la barra queda vacía.
export function ProgressBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const ratio = max <= 0 ? 0 : Math.min(value / max, 1);
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 16,
  },
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  field: {
    gap: 8,
  },
  label: {
    color: colors.greenDark,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.text,
  },
  multiline: {
    minHeight: 110,
    paddingTop: 14,
  },
  button: {
    backgroundColor: colors.green,
    borderRadius: 12,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryText: {
    color: colors.greenDark,
  },
  pressed: {
    opacity: 0.88,
  },
  inactive: {
    opacity: 0.55,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  track: {
    height: 10,
    borderRadius: 99,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 99,
  },
});
