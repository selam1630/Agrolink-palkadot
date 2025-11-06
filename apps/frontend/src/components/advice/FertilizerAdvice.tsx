import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import agriIcon from "@/assets/images/agriIcon.png";

interface SoilData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  region?: string;
  ph?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  recommendation?: string; 
}

const FertilizerAdvice: React.FC = () => {
  const { token } = useAuth();
  const [farmers, setFarmers] = useState<SoilData[]>([]);
  const [filteredFarmers, setFilteredFarmers] = useState<SoilData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "https://agrolink-updated-2-5.onrender.com/api";
  useEffect(() => {
    const fetchFarmers = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/fertilizer/farmers`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const mappedFarmers: SoilData[] = res.data.map((f: any) => ({
          id: f.id,
          name: f.name,
          phone: f.phone,
          email: f.email,
          region: f.soilData?.region || f.region || "-",
          ph: f.soilData?.ph ?? undefined,
          nitrogen: f.soilData?.nitrogen ?? undefined,
          phosphorus: f.soilData?.phosphorus ?? undefined,
          potassium: f.soilData?.potassium ?? undefined,
          recommendation: f.recommendation || "No advice yet", // ✅
        }));

        setFarmers(mappedFarmers);
        setFilteredFarmers(mappedFarmers);
      } catch (err: any) {
        if (err.response) {
          console.error(
            "Backend Error:",
            err.response.status,
            err.response.data
          );
          setErrorMessage(
            `Failed to fetch farmers: ${err.response.status} - ${JSON.stringify(
              err.response.data
            )}`
          );
        } else if (err.request) {
          console.error("No response from server:", err.request);
          setErrorMessage("No response from server");
        } else {
          console.error("Axios Error:", err.message);
          setErrorMessage(`Axios Error: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFarmers();
  }, [token, API_URL]);

  // ✅ Search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setSearch(value);
    const filtered = farmers.filter(
      (f) =>
        f.name?.toLowerCase().includes(value) ||
        f.region?.toLowerCase().includes(value)
    );
    setFilteredFarmers(filtered);
  };

  // ✅ Send advice
  const sendAdvice = async (farmer: SoilData) => {
    if (!farmer.id) return;

    const recommended =
      farmer.ph && farmer.ph < 6
        ? "Use Lime to increase soil pH and DAP fertilizer"
        : farmer.ph && farmer.ph > 7
        ? "Apply Sulphur-based fertilizer to lower pH"
        : "Use balanced NPK fertilizer (10-10-10)";

    try {
      await axios.post(
        `${API_URL}/fertilizer/send-advice`,
        { farmerId: farmer.id, advice: recommended },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccessMessage(`Advice sent to ${farmer.name}: ${recommended}`);
      setFarmers((prev) =>
        prev.map((f) =>
          f.id === farmer.id ? { ...f, recommendation: recommended } : f
        )
      );
      setFilteredFarmers((prev) =>
        prev.map((f) =>
          f.id === farmer.id ? { ...f, recommendation: recommended } : f
        )
      );
    } catch (err: any) {
      if (err.response) {
        console.error(
          "Backend Error on sending advice:",
          err.response.status,
          err.response.data
        );
        setErrorMessage(
          `Failed to send advice: ${err.response.status} - ${JSON.stringify(
            err.response.data
          )}`
        );
      } else if (err.request) {
        console.error("No response from server:", err.request);
        setErrorMessage("No response from server");
      } else {
        console.error("Axios Error:", err.message);
        setErrorMessage(`Axios Error: ${err.message}`);
      }
    }

    setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 3000);
  };

  if (loading) return <div className="p-6 text-center">Loading farmers...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center mb-6">
        <img src={agriIcon} alt="AgroLink Logo" className="w-16 h-16 mr-4" />
        <h1 className="text-3xl font-bold text-green-700">Fertilizer Advice</h1>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by farmer name or region..."
          value={search}
          onChange={handleSearch}
          className="w-full md:w-1/2 p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="mb-4 text-green-600 font-semibold">{successMessage}</div>
      )}
      {errorMessage && (
        <div className="mb-4 text-red-600 font-semibold">{errorMessage}</div>
      )}

      {/* Farmers Table */}
      <div className="overflow-x-auto bg-white shadow-md rounded-lg">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-green-100 text-left text-gray-700">
              <th className="p-4">Farmer Name</th>
              <th className="p-4">Region</th>
              <th className="p-4">pH</th>
              <th className="p-4">Nitrogen</th>
              <th className="p-4">Phosphorus</th>
              <th className="p-4">Potassium</th>
              <th className="p-4">Recommendation</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredFarmers.map((farmer) => (
              <tr
                key={farmer.id}
                className="border-t hover:bg-green-50 transition duration-150"
              >
                <td className="p-4">{farmer.name}</td>
                <td className="p-4">{farmer.region || "-"}</td>
                <td className="p-4">{farmer.ph ?? "-"}</td>
                <td className="p-4">{farmer.nitrogen ?? "-"}</td>
                <td className="p-4">{farmer.phosphorus ?? "-"}</td>
                <td className="p-4">{farmer.potassium ?? "-"}</td>
                <td className="p-4 text-sm text-gray-700">
                  {farmer.recommendation || (
                    <span className="text-gray-400 italic">No advice yet</span>
                  )}
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => sendAdvice(farmer)}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition duration-200"
                  >
                    Send Advice
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FertilizerAdvice;
