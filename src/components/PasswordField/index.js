/**
 * Champ mot de passe réutilisable avec icône œil pour afficher/masquer.
 * Utilisé sur Connexion et Création de compte.
 */
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

const EYE_ICON_SIZE = 22;
const INPUT_PADDING_RIGHT = 48;

export default function PasswordField({
  value,
  onChangeText,
  placeholder,
  style,
  placeholderTextColor,
  editable = true,
  ...rest
}) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <TextInput
        {...rest}
        style={[styles.input, style, { paddingRight: INPUT_PADDING_RIGHT }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
      />
      <TouchableOpacity
        style={styles.eyeButton}
        onPress={() => setVisible((v) => !v)}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons
          name={visible ? 'eye-off-outline' : 'eye-outline'}
          size={EYE_ICON_SIZE}
          color="rgba(255, 255, 255, 0.6)"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    width: '100%',
  },
  input: {
    backgroundColor: '#2E3240',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    fontSize: 16,
    fontFamily: theme.fonts.button,
    fontWeight: '400',
    color: '#FFFFFF',
    marginBottom: 14,
    borderWidth: 0,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -10,
  },
});
