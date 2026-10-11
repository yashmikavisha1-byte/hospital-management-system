import { createContext, useContext, useState } from "react";
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

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    const u = { name: data.name, role: data.role };
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}