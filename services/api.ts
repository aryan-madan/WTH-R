import { Weather, Place } from '../types';
import { Geolocation } from '@capacitor/geolocation';

const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const API = 'https://api.open-meteo.com/v1/forecast';
const AQI_API = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const REV = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

export const get = async (lat: number, lon: number): Promise<Weather> => {
  const [weatherRes, aqiRes] = await Promise.all([
    fetch(
      `${API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,is_day,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature,precipitation,surface_pressure,wind_direction_10m,cloud_cover&timeformat=unixtime&timezone=auto`
    ),
    fetch(
      `${AQI_API}?latitude=${lat}&longitude=${lon}&current=pm2_5,us_aqi`
    )
  ]);

  if (!weatherRes.ok) throw new Error('Failed');
  
  const weatherData = await weatherRes.json();
  const aqiData = aqiRes.ok ? await aqiRes.json() : { current: { pm2_5: 0, us_aqi: 0 } };
  
  return {
    current: {
      temp: weatherData.current.temperature_2m,
      code: weatherData.current.weather_code,
      day: weatherData.current.is_day,
      wind: weatherData.current.wind_speed_10m,
      humidity: weatherData.current.relative_humidity_2m,
      feels_like: weatherData.current.apparent_temperature,
      pressure: weatherData.current.surface_pressure,
      precip: weatherData.current.precipitation,
      wind_dir: weatherData.current.wind_direction_10m,
      cloud: weatherData.current.cloud_cover,
      pm25: aqiData.current?.pm2_5 ?? 0,
      aqi: aqiData.current?.us_aqi ?? 0
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

export const locate = async (): Promise<Place> => {
  try {
    // use capacitor geolocation for native ios support
    const coordinates = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000
    });
    
    const { latitude, longitude } = coordinates.coords;
    const name = await getCityName(latitude, longitude);
    
    return {
      lat: latitude,
      lon: longitude,
      name: name
    };
  } catch (e) {
    // fallback to NYC if denied or error
    return { lat: 40.7128, lon: -74.0060, name: 'New York' };
  }
};