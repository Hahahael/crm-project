import { useEffect, useState } from "react";
import UserDetails from "./UserDetails";
import { apiBackendFetch } from "../services/api";

const UserDetailsWrapper = ({ userId, onBack, onEdit, onDelete }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiBackendFetch(`/api/users/${userId}`);
        if (!res.ok) throw new Error("User not found");
        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch user.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (loading) return <p className="p-4">Loading user...</p>;
  if (error) return <p className="p-4 text-red-600">{error}</p>;
  if (!user) return <p className="p-4 text-red-600">User not found</p>;

  return (
    <UserDetails
      user={user}
      onBack={onBack}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
};

export default UserDetailsWrapper;
