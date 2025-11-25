import { Weather, Place } from '../types';

const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const API = 'https://api.open-meteo.com/v1/forecast';
const REV = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

export const get = async (lat: number, lon: number): Promise<Weather> => {
  const res = await fetch(
    `${API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,is_day,weather_code,wind_speed_10m&timeformat=unixtime&timezone=auto`
  );
  if (!res.ok) throw new Error('Failed');
  const data = await res.json();
  
  return {
    current: {
      temp: data.current.temperature_2m,
      code: data.current.weather_code,
      day: data.current.is_day,
      wind: data.current.wind_speed_10m
    }
  };
};

export const search = async (query: string): Promise<Place[]> => {
  const res = await fetch(`${GEO}?name=${query}&count=5&language=en&format=json`);
  if (!res.ok) return [];
  const data = await res.json();
  if (!data.results) return [];
  return data.results.map((item: any) => ({
    lat: item.latitude,
    lon: item.longitude,
    name: item.name,
    admin: item.admin1,
    country: item.country
  }));
};

const getCityName = async (lat: number, lon: number): Promise<string> => {
  try {
    const res = await fetch(`${REV}?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    const data = await res.json();
    return data.city || data.locality || data.principalSubdivision || "Unknown";
  } catch {
    return "Unknown";
  }
};

export const locate = (): Promise<Place> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: 40.7128, lon: -74.0060, name: 'New York' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const name = await getCityName(pos.coords.latitude, pos.coords.longitude);
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          name: name
        });
      },
      () => {
        resolve({ lat: 40.7128, lon: -74.0060, name: 'New York' });
      }
    );
  });
};