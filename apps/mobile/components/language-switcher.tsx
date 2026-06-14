import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, useTheme } from '@klasso/ui-mobile';
import { LANGUAGES, setAppLanguage, type AppLanguage } from '@/lib/i18n';

/**
 * In-app language picker (fr / en / es / ar). Switching updates the UI text
 * immediately; for Arabic the RTL layout fully flips only after an app restart,
 * so we prompt the user when the direction changes.
 */
export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const theme = useTheme();
  const [current, setCurrent] = useState<string>(i18n.language);

  async function choose(code: AppLanguage) {
    if (code === current) return;
    setCurrent(code);
    const { rtlChanged } = await setAppLanguage(code);
    if (rtlChanged) {
      Alert.alert(
        'Redémarrage requis',
        "Fermez puis rouvrez l'application pour appliquer la nouvelle orientation (RTL / LTR).",
      );
    }
  }

  return (
    <View style={{ gap: 8 }}>
      {LANGUAGES.map((lang) => {
        const active = lang.code === current;
        return (
          <Pressable
            key={lang.code}
            onPress={() => choose(lang.code)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={lang.label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: active ? theme.primary : colors.line,
              backgroundColor: active ? theme.primaryTint : colors.surface,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontFamily: fonts.bodySemibold,
                color: active ? theme.primary : colors.ink[900],
              }}
            >
              {lang.label}
            </Text>
            {active ? (
              <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
