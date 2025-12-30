import { GeoLocation } from '../types';

interface WeatherData {
  temperature: number;
  windSpeed: number;
}

export const getLocalWeather = async (geo: GeoLocation): Promise<WeatherData> => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lng}&current_weather=true&temperature_unit=fahrenheit&wind_speed_unit=mph`
    );
    const data = await response.json();
    
    if (data.current_weather) {
      return {
        temperature: Math.round(data.current_weather.temperature),
        windSpeed: Math.round(data.current_weather.windspeed),
      };
    }
    throw new Error("No weather data available");
  } catch (error) {
    console.error("Weather Fetch Error:", error);
    // Fallback or rethrow
    return { temperature: 70, windSpeed: 5 }; // Default fallback
  }
};