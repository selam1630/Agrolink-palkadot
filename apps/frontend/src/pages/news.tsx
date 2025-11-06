import React, { useState, useEffect } from "react";
import axios from "axios";

interface Post {
  id: string;
  category: "news" | "market";
  title: string;
  description: string;
  prices?: { commodity: string; price: string }[];
  createdAt: string;
}

const PostsDisplayPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get("https://agrolink-updated-2-6.onrender.com/news"); // match your backend route
        setPosts(response.data);
      } catch (err) {
        console.error("❌ Failed to fetch news:", err);
        setError("Failed to load posts. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) return <p className="text-center mt-6">Loading posts...</p>;
  if (error) return <p className="text-center text-red-600 mt-6">{error}</p>;

  return (
    <div className="min-h-screen bg-green-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-green-700 text-center mb-8">
          📢 Latest Agriculture Updates
        </h1>

        {posts.length === 0 ? (
          <p className="text-center text-gray-500">No posts available yet.</p>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white shadow-md rounded-xl p-6 border border-gray-200"
              >
                <h2 className="text-2xl font-bold text-green-800">{post.title}</h2>
                <p className="text-sm text-gray-500 mb-4">
                  {new Date(post.createdAt).toLocaleDateString()}
                </p>

                <p className="text-gray-700 mb-4">{post.description}</p>

                {/* Show market prices if it's a market post */}
                {post.category === "market" && post.prices && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-green-100 text-left">
                          <th className="border border-gray-300 px-4 py-2">Commodity</th>
                          <th className="border border-gray-300 px-4 py-2">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {post.prices.map((item, index) => (
                          <tr key={index}>
                            <td className="border border-gray-300 px-4 py-2">{item.commodity}</td>
                            <td className="border border-gray-300 px-4 py-2">{item.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostsDisplayPage;
