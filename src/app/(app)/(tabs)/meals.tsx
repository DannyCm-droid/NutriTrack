import { useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { LoadingScreen, Screen } from '@/components/ui';
import { colors } from '@/constants/palette';
import { useAuth } from '@/context/auth-context';
import { useMeals } from '@/hooks/use-records';
import { formatDay, formatMacro, formatTime } from '@/lib/format';
import { deleteMeal } from '@/services/user-data';
import type { Meal } from '@/types/models';

export default function MealsScreen() {
  const { user } = useAuth();
  const { items, loading, error } = useMeals();
  const [openId, setOpenId] = useState<string | null>(null);

  if (loading && items.length === 0) return <LoadingScreen />;

  const sections = groupMeals(items);

  function confirmDelete(meal: Meal) {
    if (!user) return;
    Alert.alert('Eliminar comida', 'Esta comida se quitará de tu historial.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          deleteMeal(user.uid, meal.id).catch(() => {
            Alert.alert('No se pudo eliminar', 'Inténtalo de nuevo en un momento.');
          });
        },
      },
    ]);
  }

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        style={styles.flex}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Historial</Text>
            <Text style={styles.subtitle}>Tus comidas guardadas, del día más reciente al más antiguo.</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Todavía no hay comidas. Registra la primera desde Inicio.</Text>
        }
        renderSectionHeader={({ section }) => <Text style={styles.day}>{section.title}</Text>}
        renderItem={({ item }) => {
          const open = openId === item.id;
          return (
            <View style={styles.card}>
              <Pressable onPress={() => setOpenId(open ? null : item.id)}>
                <View style={styles.row}>
                  <View style={styles.copy}>
                    <Text style={styles.description} numberOfLines={open ? undefined : 2}>
                      {item.description}
                    </Text>
                    <Text style={styles.meta}>{formatTime(item.eatenAt)}</Text>
                  </View>
                  <Text style={styles.calories}>{Math.round(item.calories)} kcal</Text>
                </View>
                <Text style={styles.meta}>
                  P {formatMacro(item.protein)} g · C {formatMacro(item.carbs)} g · G{' '}
                  {formatMacro(item.fat)} g
                </Text>
              </Pressable>
              {open
                ? item.items.map((food, index) => (
                    <View key={`${item.id}-${index}`} style={styles.food}>
                      <Text style={styles.foodName}>{food.name}</Text>
                      <Text style={styles.meta}>
                        {food.quantityLabel} · {Math.round(food.calories)} kcal
                        {food.recognized ? '' : ' · revisa este valor'}
                      </Text>
                    </View>
                  ))
                : null}
              {open ? (
                <Pressable onPress={() => confirmDelete(item)}>
                  <Text style={styles.delete}>Eliminar comida</Text>
                </Pressable>
              ) : (
                <Text style={styles.meta}>Toca para ver el detalle</Text>
              )}
            </View>
          );
        }}
      />
    </Screen>
  );
}

function groupMeals(meals: Meal[]) {
  const sections: { title: string; data: Meal[] }[] = [];
  for (const meal of meals) {
    const title = formatDay(meal.eatenAt);
    const current = sections[sections.length - 1];
    if (current?.title === title) current.data.push(meal);
    else sections.push({ title, data: [meal] });
  }
  return sections;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 10,
  },
  header: {
    gap: 6,
    marginBottom: 8,
  },
  title: {
    color: colors.greenDark,
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  day: {
    color: colors.greenDark,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  description: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  calories: {
    color: colors.green,
    fontWeight: '700',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  food: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    gap: 2,
  },
  foodName: {
    color: colors.text,
    fontWeight: '600',
  },
  delete: {
    color: colors.danger,
    fontWeight: '700',
    paddingTop: 4,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
});
