import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
const NewPostingPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    category: "news",
    title: "",
    description: "",
    prices: [{ commodity: "", price: "" }],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePriceChange = (index: number, field: string, value: string) => {
    const updatedPrices = [...formData.prices];
    updatedPrices[index][field as "commodity" | "price"] = value;
    setFormData({ ...formData, prices: updatedPrices });
  };

  const addPriceField = () => {
    setFormData({
      ...formData,
      prices: [...formData.prices, { commodity: "", price: "" }],
    });
  };
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  try {
    await axios.post("http://localhost:5000/news", formData);
    alert("News posted successfully and sent to farmers!");
    setFormData({
      category: "news",
      title: "",
      description: "",
      prices: [{ commodity: "", price: "" }],
    });
  } catch (err: any) {
    console.error("❌ Failed to post news:", err);
    setError("Failed to create news. Please try again.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="flex items-center justify-center min-h-screen bg-blue-50 p-4">
      <div className="bg-white p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-lg">
        <h1 className="text-3xl md:text-4xl font-bold text-green-700 text-center mb-6">
          Create New Posting
        </h1>

        {error && (
          <p className="text-red-600 text-center font-semibold mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="news">Agriculture News</option>
              <option value="market">Weekly Market Prices</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter post title"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              placeholder="Enter post description"
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Weekly Market Prices */}
          {formData.category === "market" && (
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Market Prices
              </label>
              {formData.prices.map((price, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Commodity"
                    value={price.commodity}
                    onChange={(e) =>
                      handlePriceChange(index, "commodity", e.target.value)
                    }
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={price.price}
                    onChange={(e) =>
                      handlePriceChange(index, "price", e.target.value)
                    }
                    className="w-28 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addPriceField}
                className="text-blue-600 hover:underline mt-1"
              >
                ➕ Add another commodity
              </button>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="bg-gray-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600 transition-all duration-300"
            >
              Back
            </button>

            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-all duration-300 disabled:opacity-50"
            >
              {loading ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPostingPage;
