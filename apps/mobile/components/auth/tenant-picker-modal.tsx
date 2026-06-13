import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, colors, fonts, radius } from '@klasso/ui-mobile';
import { getTenantBrand } from '@/lib/api/tenant';

interface TenantOption {
  slug: string;
  name: string;
}

interface TenantPickerModalProps {
  /** Whether the picker is shown. */
  visible: boolean;
  /** Slugs returned by the API (availableTenantSlugs) for the typed email. */
  slugs: string[];
  /** Called when the user picks an establishment to retry the login with. */
  onSelect: (slug: string) => void;
  /** Called when the user dismisses the picker. */
  onClose: () => void;
  /** True while a tenant-scoped login retry is in flight. */
  loading?: boolean;
}

/**
 * Establishment picker shown when an email matches users in several tenants
 * (API returns TENANT_SLUG_REQUIRED). Resolves friendly names via the public
 * brand endpoint, falling back to the raw slug when a lookup fails.
 *
 * Médina design system — reuses @klasso/ui-mobile tokens for visual cohesion
 * with the login screen.
 */
export function TenantPickerModal({
  visible,
  slugs,
  onSelect,
  onClose,
  loading = false,
}: TenantPickerModalProps) {
  const [options, setOptions] = useState<TenantOption[]>([]);
  const [namesLoading, setNamesLoading] = useState(false);

  useEffect(() => {
    if (!visible || slugs.length === 0) return;
    let cancelled = false;
    setNamesLoading(true);

    Promise.allSettled(slugs.map((slug) => getTenantBrand(slug)))
      .then((results) => {
        if (cancelled) return;
        setOptions(
          results.map((res, i) => ({
            slug: slugs[i]!,
            name: res.status === 'fulfilled' ? res.value.name : slugs[i]!,
          })),
        );
      })
      .finally(() => {
        if (!cancelled) setNamesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, slugs]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={loading ? undefined : onClose}
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(15,12,41,0.5)',
        }}
      >
        {/* Stop propagation so taps inside the card don't dismiss the modal. */}
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: colors.paper[50],
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            paddingBottom: 36,
            gap: 12,
          }}
        >
          <View style={{ alignItems: 'center', gap: 4, marginBottom: 8 }}>
            <Text
              style={{ fontSize: 19, fontFamily: fonts.displayBold, color: colors.ink[900] }}
            >
              Choisissez votre établissement
            </Text>
            <Text style={{ fontSize: 13, color: colors.ink[500], textAlign: 'center' }}>
              Cet email est utilisé dans plusieurs établissements.
            </Text>
          </View>

          {namesLoading ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={colors.ink[500]} />
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 8 }}>
              {options.map((opt) => (
                <Button
                  key={opt.slug}
                  label={opt.name}
                  variant="secondary"
                  onPress={() => onSelect(opt.slug)}
                  disabled={loading}
                />
              ))}
            </ScrollView>
          )}

          {loading && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 4 }}>
              <ActivityIndicator color={colors.ink[500]} />
            </View>
          )}

          <Pressable
            onPress={onClose}
            disabled={loading}
            style={{ paddingVertical: 10, alignItems: 'center', borderRadius: radius.md }}
          >
            <Text style={{ fontSize: 13, color: colors.ink[300] }}>Annuler</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
