import { createContext, useCallback, useContext, useState } from "react";
import api from "./api";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

function readUser() {
  try {
    const u = JSON.parse(localStorage.getItem("user"));
    return u && u.role ? u : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);

  const saveSession = useCallback((data) => {
    localStorage.setItem("token", data.token);
    const nextUser = { name: data.name, role: data.role };
    localStorage.setItem("user", JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    saveSession(data);
    return data;
  };

  const register = async (details) => {
    const { data } = await api.post("/auth/register", details);
    saveSession(data);
    return data;
  };

  const loginWithGoogle = useCallback(async (code, role) => {
    const { data } = await api.post("/auth/google", { code, role });
    saveSession(data);
  }, [saveSession]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}