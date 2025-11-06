import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext"; 
import { Leaf, Shovel } from "lucide-react"; 

interface AdviceResult {
  region: string;
  specificLocation: string; 
  soilData: {
    ph: number;
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };
  recommendation: string;
}

const FarmerAdviceDashboard: React.FC = () => {
  const { token } = useAuth(); 
  const [searchRegion, setSearchRegion] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [advice, setAdvice] = useState<AdviceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const API_URL = "https://agrolink-updated-2-5.onrender.com/api"; 

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAdvice(null);
    if (!searchRegion.trim() || !searchLocation.trim()) {
      setError("Please enter both the Region and Specific Location.");
      return;
    }
    if (!token) {
      setError("Authentication required.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/fertilizer/advice/search`, {
        params: { 
          region: searchRegion.trim(),
          specificLocation: searchLocation.trim(), 
        },
        headers: { Authorization: `Bearer ${token}` },
      });

      setAdvice(res.data);
    } catch (err: any) {
      const message = err.response?.data?.error || "Failed to fetch advice.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-green-50 min-h-screen">
      {/* Header - Using Leaf icon instead of image */}
      <div className="flex items-center mb-8">
        <Leaf className="w-10 h-10 mr-4 text-green-700" size={40} />
        <h1 className="text-3xl font-semibold text-green-800">
          Precise Fertilizer Advice
        </h1>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 max-w-2xl">
          {/* Region Input */}
          <input
            type="text"
            placeholder="Enter Region (e.g., Oromia)"
            value={searchRegion}
            onChange={(e) => setSearchRegion(e.target.value)}
            className="flex-grow p-3 border border-green-400 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {/* Specific Location Input (New) */}
          <input
            type="text"
            placeholder="Enter Specific Location (e.g., Adama)"
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
            className="flex-grow p-3 border border-green-400 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-lg font-semibold transition duration-200 disabled:opacity-50"
          >
            {loading ? "Searching..." : "Get Advice"}
          </button>
        </div>
      </form>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-200 text-red-800 rounded-lg font-semibold max-w-2xl">
          ⚠️ {error}
        </div>
      )}

      {/* Advice Results */}
      {advice && (
        <div className="bg-white p-6 border-t-4 border-green-600 shadow-xl rounded-lg max-w-3xl">
          <h2 className="text-2xl font-semibold text-green-800 mb-2">
            Soil Report for {advice.specificLocation}, {advice.region}
          </h2>
          <p className="text-sm text-gray-500 mb-4">Based on local average soil conditions.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 border rounded-lg bg-gray-50">
            <p className="font-medium text-gray-700">
              <span className="font-bold text-yellow-800">pH:</span> {advice.soilData.ph}
            </p>
            <p className="font-medium text-gray-700">
              <span className="font-bold text-yellow-800">Nitrogen (N):</span> {advice.soilData.nitrogen} ppm
            </p>
            <p className="font-medium text-gray-700">
              <span className="font-bold text-yellow-800">Phosphorus (P):</span> {advice.soilData.phosphorus} ppm
            </p>
            <p className="font-medium text-gray-700">
              <span className="font-bold text-yellow-800">Potassium (K):</span> {advice.soilData.potassium} ppm
            </p>
          </div>

          <div className="p-4 bg-green-100 border-l-4 border-green-600 text-green-800 rounded-md">
            <h3 className="font-bold text-xl mb-2 flex items-center">
                 <Shovel className="inline-block mr-2" /> Recommendation:
            </h3>
            <p className="text-lg">{advice.recommendation}</p>
          </div>
        </div>
      )}

      {/* Call to action if no advice is found after search */}
      {!loading && !advice && (searchRegion.trim() || searchLocation.trim()) && !error && (
        <div className="p-6 text-center text-gray-500 italic max-w-lg bg-white rounded-lg shadow-md">
          Enter your Region and Specific Location to receive customized fertilizer advice!
        </div>
      )}
    </div>
  );
};

export default FarmerAdviceDashboard;
