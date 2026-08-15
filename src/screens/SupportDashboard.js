import React, { useState } from "react";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const SupportDashboard = () => {
  const [identifier, setIdentifier] = useState("");
  const [type, setType] = useState("bvn"); // bvn, nimc, data, vtu, cable, utility
  const [userData, setUserData] = useState(null);
  const [traceData, setTraceData] = useState([]);
  const [loading, setLoading] = useState(false);

  const getConfig = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("userToken") : "";
    return {
      headers: { Authorization: `Bearer ${token}` },
    };
  };

  // 1. Search for User & Transactions
  const handleUserSearch = async () => {
    if (!identifier.trim()) {
      alert("Please enter a valid search identifier");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(
        `${BASE_URL}/support/search-user/${identifier.trim()}`,
        getConfig()
      );
      setUserData(res.data.data || res.data);
      setTraceData([]); // Clear trace when searching new user
    } catch (err) {
      alert(err.response?.data?.message || "User not found");
    } finally {
      setLoading(false);
    }
  };

  // 2. Trace Specific Service (BVN/NIMC/VTU/Data/etc.)
  const handleTrace = async () => {
    if (!identifier.trim()) {
      alert("Please enter an identifier or ID to trace");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(
        `${BASE_URL}/support/trace/${type}/${identifier.trim()}`,
        getConfig()
      );
      setTraceData(res.data.data || res.data);
      setUserData(null); // Clear user profile when tracing specific work
    } catch (err) {
      alert(err.response?.data?.message || "No records found for this ID");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-blue-900">
        Support & Tracing Portal
      </h1>

      {/* SEARCH BAR */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[250px]">
          <label className="block text-sm font-medium text-gray-700">
            Identifier (Email/Phone/NIN/BVN/Reference)
          </label>
          <input
            type="text"
            className="w-full mt-1 border p-2 rounded"
            placeholder="Enter search term..."
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>

        <select
          className="border p-2 rounded bg-white h-[42px]"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <optgroup label="Identity Services">
            <option value="bvn">BVN Service</option>
            <option value="nimc">NIMC Service</option>
          </optgroup>
          <optgroup label="VTU & Bills">
            <option value="data">Mobile Data</option>
            <option value="vtu">Airtime / VTU</option>
            <option value="cable">Cable TV (GOTV/DSTV)</option>
            <option value="utility">Electricity (Units)</option>
          </optgroup>
        </select>

        <button
          onClick={handleUserSearch}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 h-[42px]"
        >
          Search User
        </button>

        <button
          onClick={handleTrace}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 h-[42px]"
        >
          Trace ID
        </button>
      </div>

      {loading && (
        <p className="text-blue-600 font-bold mb-4">Processing request...</p>
      )}

      {/* USER PROFILE & TRANSACTIONS */}
      {userData && userData.profile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
            <h2 className="font-bold text-lg mb-2">User Profile</h2>
            <p>
              <strong>Name:</strong> {userData.profile.firstName}{" "}
              {userData.profile.surname}
            </p>
            <p>
              <strong>Email:</strong> {userData.profile.email}
            </p>
            <p>
              <strong>Phone:</strong> {userData.profile.phone}
            </p>
            <p>
              <strong>Wallet:</strong> ₦{userData.profile.walletBalance || 0}
            </p>
          </div>
          <div className="lg:col-span-2 bg-white p-4 rounded shadow">
            <h2 className="font-bold text-lg mb-2">Recent Transactions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="p-2">Ref</th>
                    <th className="p-2">Amount</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {userData.recentTransactions && userData.recentTransactions.length > 0 ? (
                    userData.recentTransactions.map((tx) => (
                      <tr key={tx._id} className="border-b">
                        <td className="py-2 p-2">{tx.reference}</td>
                        <td className="p-2">₦{tx.amount}</td>
                        <td
                          className={`p-2 font-semibold ${
                            tx.status === "success"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {tx.status}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="p-4 text-center text-gray-500">
                        No recent transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TRACE RESULTS (BVN/NIMC/VTU/ETC.) */}
      {Array.isArray(traceData) && traceData.length > 0 && (
        <div className="bg-white p-6 rounded shadow-md border-t-4 border-orange-500">
          <h2 className="font-bold text-xl mb-4 uppercase">
            {type} Verification Records
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-800 text-white text-left">
                  <th className="p-2">Date</th>
                  <th className="p-2">User</th>
                  <th className="p-2">ID Number / Reference</th>
                  <th className="p-2">Service</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {traceData.map((item) => (
                  <tr key={item._id} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-xs">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="p-2 font-semibold">
                      {item.user?.firstName} {item.user?.surname}
                    </td>
                    <td className="p-2 font-mono">
                      {item.bvnNumber || item.ninNumber || item.reference || "N/A"}
                    </td>
                    <td className="p-2 uppercase text-xs text-blue-600">
                      {item.serviceType || type}
                    </td>
                    <td
                      className={`p-2 font-bold ${
                        item.status === "success" ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {item.status ? item.status.toUpperCase() : "PENDING"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportDashboard;