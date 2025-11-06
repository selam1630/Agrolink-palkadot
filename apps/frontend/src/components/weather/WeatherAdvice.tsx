import React, { useState, useEffect } from 'react';

interface Weather { id: number; main: string; description: string; icon: string; }
interface Main { temp: number; feels_like: number; temp_min: number; temp_max: number; pressure: number; humidity: number; }
interface Wind { speed: number; deg: number; }
interface WeatherData { weather: Weather[]; main: Main; wind: Wind; name: string; }

interface Advice {
  weatherPrediction: string;
  soilAndWaterAdvice: string;
  pestAndDiseaseAdvice: string;
  recommendedCrops: string[];
  emergencyPreparedness: string;
  locationSpecificTips: string;
  disasterAlerts: { description: string }[];
}

interface APIResponse { location: string; weatherData: WeatherData; advice: Advice; }

// 🟢 Translation dictionary for headers
const translations: Record<string, any> = {
  en: {
    weather: "Weather & Forecast",
    soil: "Soil & Water Management",
    pest: "Pest & Disease Prevention",
    crops: "Recommended Crops",
    emergency: "Emergency Preparedness",
    location: "Location-Specific Tips",
  },
  am: {
    weather: "አየር እና ትንቢት",
    soil: "አፈር እና ውሃ አስተዳደር",
    pest: "ተባይ እና በሽታ መከላከያ",
    crops: "የሚመከሩ ሰብሎች",
    emergency: "አደጋ አዘጋጅት",
    location: "ቦታ ተወላጅ ምክሮች",
  },
  ti: {
    weather: "ኩነታት ኣየር እና ትንቢት",
    soil: "ኣፈርን ማይን ኣስተዳደር",
    pest: "ተባዕታትን በሽታን መከላከያ",
    crops: "ናይ ምኽሪ ሰብሳብቲ",
    emergency: "ዝርዝር ኣደጋ",
    location: "ምክር ቦታዊ",
  },
  om: {
    weather: "Haala Qilleensaa fi Ragaa",
    soil: "Qindoomina Lafaa fi Bishaanii",
    pest: "Beela fi Dhukkuba Ittisa",
    crops: "Qonnaan Bultoota Gorsa",
    emergency: "Qophii Yeroo Ariifachiisaa",
    location: "Gorsa Bakka Qabatamaa",
  },
};

const WeatherDashboard: React.FC = () => {
  const [data, setData] = useState<APIResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [language, setLanguage] = useState<string>('en');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation({ lat: position.coords.latitude, lon: position.coords.longitude }),
        (err) => { console.error(err); setError("Allow location access to fetch weather."); setIsLoading(false); }
      );
    } else {
      setError("Geolocation not supported.");
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!userLocation) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("https://agrolink-updated-2-5.onrender.com/api/weather-prediction/advice-for-dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...userLocation, language }),
        });
        if (!res.ok) throw new Error((await res.json()).message || "Failed to fetch data.");
        setData(await res.json());
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [userLocation, language]);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-100 via-green-50 to-green-100 animate-pulse">
      <div className="text-green-700 text-xl font-semibold">Loading agricultural advice...</div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-green-50 p-6">
      <div className="bg-white p-8 rounded-3xl shadow-2xl text-red-700 font-medium max-w-lg text-center">
        <h2 className="text-2xl font-bold mb-4">Error</h2>
        <p>{error}</p>
      </div>
    </div>
  );

  if (!data || !data.advice) return (
    <div className="flex items-center justify-center min-h-screen bg-green-50 p-6">
      <div className="bg-white p-8 rounded-3xl shadow-2xl text-gray-700 font-medium max-w-lg text-center">
        <h2 className="text-2xl font-bold mb-4">No Advice Available</h2>
        <p>Please check your backend response.</p>
      </div>
    </div>
  );

  const { weatherData, advice, location } = data;
  const { weatherPrediction, soilAndWaterAdvice, pestAndDiseaseAdvice, recommendedCrops, emergencyPreparedness, locationSpecificTips, disasterAlerts } = advice;

  const weatherIconUrl = weatherData.weather[0]?.icon
    ? `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@4x.png`
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-green-100 to-blue-50 flex flex-col items-center p-6 font-sans">
      
      {/* Language Selector */}
      <div className="w-full max-w-6xl mb-4 flex justify-end">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="border border-gray-300 rounded-xl p-2 shadow-sm bg-white focus:ring-2 focus:ring-green-500"
        >
          <option value="en">English</option>
          <option value="am">Amharic</option>
          <option value="om">Oromo</option>
          <option value="ti">Tigrinya</option>
        </select>
      </div>

      {/* Hero Banner */}
      <div className="w-full max-w-6xl mb-8 relative rounded-3xl overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-green-700/70 via-green-500/40 to-green-300/20"></div>
        <img
          src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&h=500"
          alt="Farm Banner"
          className="w-full h-64 object-cover"
        />
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white z-10 px-6">
          <h1 className="text-5xl font-extrabold drop-shadow-lg text-center">Agricultural Dashboard</h1>
          <p className="mt-2 text-lg drop-shadow-md">{location || "Your Location"}</p>
        </div>
      </div>

      {/* Main Weather & Advice */}
      <div className="w-full max-w-6xl grid md:grid-cols-3 gap-6">

        {/* Weather Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl px-4 py-2 shadow-md flex flex-col items-center justify-center transition-transform hover:scale-105 w-40 h-32">
          <img src={weatherIconUrl} alt="Weather Icon" className="w-12" />
          <p className="text-2xl font-bold text-blue-600 mt-1">{Math.round(weatherData.main.temp)}°C</p>
          <p className="capitalize text-gray-700 mt-1 text-xs text-center truncate">{weatherData.weather[0]?.description}</p>
        </div>

        {/* Disaster Alerts */}
        {disasterAlerts?.length > 0 && (
          <div className="col-span-3 bg-red-100/90 backdrop-blur-md rounded-3xl p-4 shadow-lg animate-pulse">
            <h3 className="font-bold text-xl text-red-700 mb-2 flex items-center gap-2">
              ⚠️ Disaster Alerts
            </h3>
            {disasterAlerts.map((alert, idx) => (
              <p key={idx} className="text-red-800">{alert.description}</p>
            ))}
          </div>
        )}

        {/* Advice Cards */}
        {[
          { title: translations[language].weather, content: weatherPrediction },
          { title: translations[language].soil, content: soilAndWaterAdvice },
          { title: translations[language].pest, content: pestAndDiseaseAdvice },
          { title: translations[language].crops, content: recommendedCrops },
          { title: translations[language].emergency, content: emergencyPreparedness },
          { title: translations[language].location, content: locationSpecificTips }
        ].map((section, idx) => (
          <div
            key={idx}
            className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-lg transition-transform hover:scale-105"
          >
            <h3 className="text-2xl font-bold text-green-800 mb-3 border-b-2 border-green-300 pb-1">{section.title}</h3>
            {Array.isArray(section.content) ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {section.content.map((item: string, i: number) => (
                  <span
                    key={i}
                    className="bg-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-medium shadow-sm hover:bg-green-300 transition-colors cursor-pointer"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-700 leading-relaxed">{section.content}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeatherDashboard;
