import React, { useState, useEffect } from "react";
import axios from "axios";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  // Kira dukkan users daga server
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("https://ayax-data-xpress-server.onrender.com/api/v1/admin/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setUsers(data.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching users", err);
      setError("Failed to load users list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const changeRole = async (userId, newRole) => {
    if (!newRole) return;
    
    const targetUser = users.find(u => u._id === userId);
    const userName = targetUser ? (targetUser.firstName || targetUser.name) : "this user";

    if (window.confirm(window.confirm(`Are you sure you want to change ${userName}'s role to ${newRole.toUpperCase()}?`))) {
      try {
        setUpdatingId(userId);
        await axios.put(
          "https://ayax-data-xpress-server.onrender.com/api/v1/admin/manage-role",
          { userId, newRole },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }
        );
        
        // Sabunta state kai tsaye ba tare da reloading ba (Enterprise approach)
        setUsers(users.map(user => user._id === userId ? { ...user, role: newRole } : user));
        alert("Role updated successfully!");
      } catch (err) {
        alert(err.response?.data?.message || "Failed to update role.");
      } finally {
        setUpdatingId(null);
      }
    }
  };

  // Tace masu amfani bisa ga abin da aka rubuta a bincike (Search filter)
  const filteredUsers = users.filter(user => {
    const fullName = `${user.firstName || ""} ${user.surname || ""} ${user.name || ""}`.toLowerCase();
    const email = (user.email || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    return fullName.includes(term) || email.includes(term);
  });

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "superadmin": return "bg-purple-100 text-purple-800 border-purple-300";
      case "supervisor": return "bg-blue-100 text-blue-800 border-blue-300";
      case "admin": return "bg-indigo-100 text-indigo-800 border-indigo-300";
      case "agent": return "bg-green-100 text-green-800 border-green-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
        <span className="ml-3 font-semibold text-gray-600">Loading Users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
        <button 
          onClick={fetchUsers}
          className="bg-blue-900 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-800 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Manage System Roles</h2>
          <p className="text-sm text-gray-500">Monitor and update staff and user access privileges.</p>
        </div>
        
        {/* Search Bar */}
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-sm"
          />
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {user.firstName || user.name} {user.surname || ""}
                      </div>
                      <div className="text-xs text-gray-500">ID: {user._id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border uppercase ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <select
                        defaultValue=""
                        disabled={updatingId === user._id}
                        onChange={(e) => changeRole(user._id, e.target.value)}
                        className="border border-gray-300 rounded-lg p-1.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:opacity-50"
                      >
                        <option value="" disabled>
                          {updatingId === user._id ? "Updating..." : "Change Role"}
                        </option>
                        <option value="superadmin">Make Superadmin</option>
                        <option value="supervisor">Make Supervisor</option>
                        <option value="admin">Make Admin</option>
                        <option value="agent">Make Agent</option>
                        <option value="user">Make User</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-gray-500 text-sm">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;