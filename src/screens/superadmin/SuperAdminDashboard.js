import React, { useEffect, useState } from "react";
import axios from "axios";

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Tabbatar kana amfani da cikakken URL ko BaseURL naku na Render
        const { data } = await axios.get("https://ayax-data-xpress-server.onrender.com/api/v1/admin/stats", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setStats(data.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching stats", err);
        setError("Failed to load system statistics.");
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-6 text-center font-semibold">Loading System Stats...</div>;

  if (error) return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Superadmin Global Overview</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-600 text-white p-4 rounded-lg shadow">
          <p>Total Revenue</p>
          <h2 className="text-xl font-bold">
            ₦{stats?.finance?.totalRevenue?.toLocaleString() || 0}
          </h2>
        </div>
        <div className="bg-green-600 text-white p-4 rounded-lg shadow">
          <p>Successful Sales</p>
          <h2 className="text-xl font-bold">
            {stats?.finance?.successfulTransactions || 0}
          </h2>
        </div>
        <div className="bg-purple-600 text-white p-4 rounded-lg shadow">
          <p>Total Agents</p>
          <h2 className="text-xl font-bold">{stats?.users?.totalAgents || 0}</h2>
        </div>
        <div className="bg-red-600 text-white p-4 rounded-lg shadow">
          <p>Total Admins</p>
          <h2 className="text-xl font-bold">{stats?.users?.totalAdmins || 0}</h2>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;