import React, { useState, useEffect } from "react";
import axios from "axios";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Kira dukkan users daga server
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await axios.get("https://ayax-data-xpress-server.onrender.com/api/v1/admin/users", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setUsers(data.data || []);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching users", err);
        setError("Failed to load users list.");
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const changeRole = async (userId, newRole) => {
    if (!newRole) return;
    
    if (
      window.confirm(`Are you sure you want to change this user to ${newRole}?`)
    ) {
      try {
        await axios.put(
          "https://ayax-data-xpress-server.onrender.com/api/v1/admin/manage-role",
          { userId, newRole },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }
        );
        alert("Role updated successfully!");
        window.location.reload(); // Don sabunta list din
      } catch (err) {
        alert(err.response?.data?.message || "Failed to update role.");
      }
    }
  };

  if (loading) return <div className="p-6 text-center font-semibold">Loading Users...</div>;

  if (error) return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;

  return (
    <div className="p-6 overflow-x-auto">
      <h2 className="text-xl font-bold mb-4">Manage System Roles</h2>
      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Name</th>
            <th className="border p-2 text-left">Email</th>
            <th className="border p-2 text-left">Current Role</th>
            <th className="border p-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id} className="hover:bg-gray-50">
              <td className="border p-2">
                {user.firstName || user.name} {user.surname || ""}
              </td>
              <td className="border p-2">{user.email}</td>
              <td className="border p-2 font-bold uppercase">
                {user.role}
              </td>
              <td className="border p-2">
                <select
                  defaultValue=""
                  onChange={(e) => changeRole(user._id, e.target.value)}
                  className="border rounded p-1 bg-white"
                >
                  <option value="" disabled>Change Role</option>
                  <option value="admin">Make Admin</option>
                  <option value="supervisor">Make Supervisor</option>
                  <option value="agent">Make Agent</option>
                  <option value="user">Make User</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserManagement;