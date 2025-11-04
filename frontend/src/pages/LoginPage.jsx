import { useState } from "react";
import { RxPerson, RxLockClosed } from "react-icons/rx";
import { useNavigate } from "react-router-dom";
import { apiBackendFetch } from "../services/api"; // use your fetch helper

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await apiBackendFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error("Invalid credentials");
      }

      // No need to store token manually
      setLoginSuccess(true);

      // Redirect after 1.5 seconds
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="relative flex h-screen items-center justify-center bg-login w-full">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-sm">
        <h2 className="mb-1 text-center text-2xl font-bold text-gray-800">
          CRM
        </h2>
        <p className="text-sm text-center text-gray-400">
          Sign in to your account to continue
        </p>

        <form onSubmit={handleLogin} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <div className="flex relative items-center">
              <RxPerson className="ml-3 text-black absolute" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:ring focus:ring-blue-200 bg-amber-50 placeholder-gray-400 text-black"
                placeholder="Enter your username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="flex relative items-center">
              <RxLockClosed className="ml-3 text-black absolute" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:ring focus:ring-blue-200 bg-amber-50 placeholder-gray-400 text-black"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-md bg-blue-500 py-2 text-white hover:bg-blue-700 transition-all ease-in cursor-pointer "
          >
            Sign In
          </button>
        </form>

        <p className="text-sm text-gray-600 text-center mt-5">
          Need help? Contact your system administrator
        </p>
      </div>

      {/* Login Success Overlay */}
      {loginSuccess && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200/50 transition-all duration-200 ease-in">
          <div
            className="bg-white p-6 rounded-lg shadow-lg text-center 
                          transform transition-transform duration-200 
                          animate-[fadeIn_0.2s_ease-in_forwards]"
          >
            <h3 className="text-xl font-bold text-green-600 mb-2">
              Login Successful!
            </h3>
            <p className="text-gray-700">Redirecting to your dashboard...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;
