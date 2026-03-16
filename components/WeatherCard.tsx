import type { ThemeColors } from '@/constants/themes';
import {
  formatWeatherDateLabel,
  getTemperatureUnitLabel,
  type SavedWeatherCity,
  type WeatherResponse,
  type WeatherUnit,
} from '@/lib/weather';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

type WeatherCardProps = {
  colors: ThemeColors;
  weather: WeatherResponse | null;
  cities: SavedWeatherCity[];
  selectedCityId: string | null;
  defaultCityId: string | null;
  unit: WeatherUnit;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  savingCity: boolean;
  settingDefault: boolean;
  addCityOpen: boolean;
  addCityValue: string;
  onChangeAddCity: (value: string) => void;
  onToggleAddCity: () => void;
  onSubmitAddCity: () => void;
  onSelectCity: (cityId: string) => void;
  onRefresh: () => void;
  onSetDefault: () => void;
};

function getWeatherIconName(condition: string | null, isDaytime: boolean): keyof typeof Ionicons.glyphMap {
  const token = condition?.toUpperCase() ?? '';

  if (token.includes('THUNDER')) return 'thunderstorm-outline';
  if (token.includes('SNOW') || token.includes('SLEET') || token.includes('ICE')) return 'snow-outline';
  if (token.includes('RAIN') || token.includes('DRIZZLE') || token.includes('SHOWER')) return 'rainy-outline';
  if (token.includes('FOG') || token.includes('MIST') || token.includes('HAZE') || token.includes('SMOKE')) {
    return 'cloud-outline';
  }
  if (token.includes('WIND')) return 'flag-outline';
  if (token.includes('CLOUD') || token.includes('OVERCAST')) return 'cloud-outline';
  if (token.includes('CLEAR') || token.includes('SUN')) return isDaytime ? 'sunny-outline' : 'moon-outline';

  return isDaytime ? 'partly-sunny-outline' : 'moon-outline';
}

function renderTemperature(value: number | null, unit: WeatherUnit): string {
  if (typeof value !== 'number') {
    return '--';
  }

  return `${Math.round(value)}\u00B0${getTemperatureUnitLabel(unit)}`;
}

export function WeatherCard({
  colors,
  weather,
  cities,
  selectedCityId,
  defaultCityId,
  unit,
  error,
  loading,
  refreshing,
  savingCity,
  settingDefault,
  addCityOpen,
  addCityValue,
  onChangeAddCity,
  onToggleAddCity,
  onSubmitAddCity,
  onSelectCity,
  onRefresh,
  onSetDefault,
}: WeatherCardProps) {
  const [showHourly, setShowHourly] = React.useState(false);
  const isSelectedCityDefault = selectedCityId !== null && selectedCityId === defaultCityId;

  return (
    <View
      className="rounded-3xl p-5"
      style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.cardBorder,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-sm font-semibold" style={{ color: colors.accent }}>
            Weather Watch
          </Text>
          <Text className="mt-1 text-2xl font-bold" style={{ color: colors.text }}>
            {weather?.city ?? 'Manila'}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
            Live weather at the top of your command center
          </Text>
        </View>

        <Pressable
          onPress={onRefresh}
          disabled={loading || refreshing}
          className="rounded-2xl px-3 py-2"
          style={({ pressed }) => ({
            backgroundColor: colors.inputBg,
            borderWidth: 1,
            borderColor: colors.inputBorder,
            opacity: pressed || refreshing ? 0.8 : 1,
          })}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="refresh-outline" size={18} color={colors.text} />
          )}
        </Pressable>
      </View>

      {loading ? (
        <View className="mt-5 items-center justify-center rounded-3xl py-8" style={{ backgroundColor: colors.inputBg }}>
          <ActivityIndicator color={colors.accent} />
          <Text className="mt-3 text-sm" style={{ color: colors.textSecondary }}>
            Loading weather...
          </Text>
        </View>
      ) : (
        <>
          <View className="mt-5 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className="h-16 w-16 items-center justify-center rounded-3xl"
                style={{ backgroundColor: colors.accent + '12' }}
              >
                <Ionicons
                  name={getWeatherIconName(weather?.current.icon ?? null, weather?.current.isDaytime ?? true)}
                  size={30}
                  color={colors.accent}
                />
              </View>
              <View className="ml-3">
                <Text className="text-4xl font-bold" style={{ color: colors.text }}>
                  {renderTemperature(weather?.current.temperature ?? null, unit)}
                </Text>
                <Text className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
                  {weather?.current.condition ?? 'Weather unavailable'}
                </Text>
              </View>
            </View>

            {!isSelectedCityDefault ? (
              <Pressable
                onPress={onSetDefault}
                disabled={settingDefault || !selectedCityId}
                className="rounded-2xl px-3 py-2"
                style={({ pressed }) => ({
                  backgroundColor: colors.warning + '12',
                  borderWidth: 1,
                  borderColor: colors.warning + '35',
                  opacity: pressed || settingDefault ? 0.85 : 1,
                })}
              >
                {settingDefault ? (
                  <ActivityIndicator size="small" color={colors.warning} />
                ) : (
                  <Text className="text-xs font-semibold" style={{ color: colors.warning }}>
                    Set Default
                  </Text>
                )}
              </Pressable>
            ) : (
              <View
                className="rounded-2xl px-3 py-2"
                style={{
                  backgroundColor: colors.success + '12',
                  borderWidth: 1,
                  borderColor: colors.success + '35',
                }}
              >
                <Text className="text-xs font-semibold" style={{ color: colors.success }}>
                  Default City
                </Text>
              </View>
            )}
          </View>

          <View className="mt-4 flex-row gap-2">
            <View
              className="flex-1 rounded-2xl p-3"
              style={{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder }}
            >
              <Text className="text-xs uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                Feels Like
              </Text>
              <Text className="mt-1 text-base font-semibold" style={{ color: colors.text }}>
                {renderTemperature(weather?.current.feelsLike ?? null, unit)}
              </Text>
            </View>
            <View
              className="flex-1 rounded-2xl p-3"
              style={{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder }}
            >
              <Text className="text-xs uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                Humidity
              </Text>
              <Text className="mt-1 text-base font-semibold" style={{ color: colors.text }}>
                {typeof weather?.current.humidity === 'number' ? `${weather.current.humidity}%` : '--'}
              </Text>
            </View>
          </View>

          {weather?.daily.length ? (
            <View className="mt-4 flex-row gap-2">
              {weather.daily.slice(0, 3).map((day) => (
                <View
                  key={day.date}
                  className="flex-1 rounded-2xl p-3"
                  style={{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder }}
                >
                  <Text className="text-xs font-semibold" style={{ color: colors.textTertiary }}>
                    {formatWeatherDateLabel(day.date)}
                  </Text>
                  <Text className="mt-2 text-sm font-semibold" style={{ color: colors.text }}>
                    {renderTemperature(day.max, unit)}
                  </Text>
                  <Text className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
                    Low {renderTemperature(day.min, unit)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {weather?.hourlyToday?.length ? (
            <View className="mt-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                  Later Today
                </Text>
                <Pressable
                  onPress={() => setShowHourly((value) => !value)}
                  className="rounded-2xl px-3 py-2"
                  style={({ pressed }) => ({
                    backgroundColor: colors.inputBg,
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text className="text-xs font-semibold" style={{ color: colors.text }}>
                    {showHourly ? 'Hide Hours' : 'View Hours'}
                  </Text>
                </Pressable>
              </View>

              {showHourly ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingTop: 12, paddingRight: 8 }}
                >
                  {weather.hourlyToday.map((entry) => (
                    <View
                      key={`${entry.timeLabel}-${entry.condition}`}
                      className="mr-2 w-24 rounded-2xl p-3"
                      style={{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder }}
                    >
                      <Text className="text-xs font-semibold" style={{ color: colors.textTertiary }}>
                        {entry.timeLabel}
                      </Text>
                      <Text className="mt-2 text-sm font-semibold" style={{ color: colors.text }}>
                        {renderTemperature(entry.temperature, unit)}
                      </Text>
                      <Text className="mt-1 text-xs" numberOfLines={2} style={{ color: colors.textSecondary }}>
                        {entry.condition}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
            </View>
          ) : null}
        </>
      )}

      <View className="mt-4 flex-row items-center justify-between">
        <Text className="text-sm font-semibold" style={{ color: colors.text }}>
          Saved Cities
        </Text>
        <Pressable
          onPress={onToggleAddCity}
          className="rounded-2xl px-3 py-2"
          style={({ pressed }) => ({
            backgroundColor: colors.accent + '12',
            borderWidth: 1,
            borderColor: colors.accent + '35',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View className="flex-row items-center">
            <Ionicons name={addCityOpen ? 'remove-outline' : 'add-outline'} size={16} color={colors.accent} />
            <Text className="ml-1 text-xs font-semibold" style={{ color: colors.accent }}>
              Add city
            </Text>
          </View>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 12, paddingRight: 8 }}
      >
        {cities.map((city) => {
          const selected = city.id === selectedCityId;

          return (
            <Pressable
              key={city.id}
              onPress={() => onSelectCity(city.id)}
              className="mr-2 rounded-full px-3 py-2"
              style={({ pressed }) => ({
                backgroundColor: selected ? colors.accent : colors.inputBg,
                borderWidth: 1,
                borderColor: selected ? colors.accent : colors.inputBorder,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View className="flex-row items-center">
                {city.isDefault ? (
                  <Ionicons
                    name="star"
                    size={12}
                    color={selected ? '#ffffff' : colors.warning}
                    style={{ marginRight: 6 }}
                  />
                ) : null}
                <Text className="text-xs font-semibold" style={{ color: selected ? '#ffffff' : colors.text }}>
                  {city.cityName}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {addCityOpen ? (
        <View
          className="mt-4 rounded-2xl p-3"
          style={{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder }}
        >
          <Text className="text-sm font-semibold" style={{ color: colors.text }}>
            Add a city
          </Text>
          <Text className="mt-1 text-xs" style={{ color: colors.textSecondary }}>
            Try Manila, Quezon City, Cebu, or Davao.
          </Text>
          <TextInput
            value={addCityValue}
            onChangeText={onChangeAddCity}
            placeholder="Enter city name"
            placeholderTextColor={colors.textTertiary}
            selectionColor={colors.accent}
            autoCapitalize="words"
            editable={!savingCity}
            style={{
              marginTop: 12,
              minHeight: 46,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              backgroundColor: colors.background,
              color: colors.text,
              paddingHorizontal: 14,
              fontSize: 15,
            }}
          />
          <Pressable
            onPress={onSubmitAddCity}
            disabled={savingCity}
            className="mt-3 items-center rounded-2xl py-3"
            style={({ pressed }) => ({
              backgroundColor: colors.accent,
              opacity: pressed || savingCity ? 0.85 : 1,
            })}
          >
            {savingCity ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-sm font-semibold text-white">Save city</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {error ? (
        <View
          className="mt-4 rounded-2xl p-3"
          style={{
            backgroundColor: colors.warning + '10',
            borderWidth: 1,
            borderColor: colors.warning + '30',
          }}
        >
          <Text className="text-sm" style={{ color: colors.text }}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
