import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";
import { useRestaurant } from "../contexts/RestaurantContext";

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  // Se conecta al contexto para obtener los datos del tema
  const { restaurant, loading: restaurantLoading } = useRestaurant();

  // Se extraen los datos del tema con valores por defecto
  const theme = restaurant?.config?.theme;
  const restaurantName = restaurant?.config?.restaurantName || "POS System";
  const primaryColor = theme?.primaryColor || '#fbbf24';
  const loginBackgroundImage = theme?.loginBackgroundImage;

  const loginStyles = {
    backgroundImage: loginBackgroundImage ? `url(${loginBackgroundImage})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    signInWithEmailAndPassword(auth, email, password).catch((err) => {
      setError("Correo o contraseña incorrectos.");
      console.error("Error de login:", err);
    });
  };

  // Muestra un estado de carga mientras se obtienen los datos del tema
  if (restaurantLoading) {
    return (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
            <p className="text-white">Cargando...</p>
        </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center" style={loginStyles}>
        <div className="absolute inset-0 bg-black bg-opacity-60 z-0"></div>
        <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-8 z-10">
            <div className="flex justify-center mb-6">
            <h1 className="text-3xl font-bold" style={{ color: primaryColor }}>
                {restaurantName}
            </h1>
            </div>

            <form onSubmit={handleLogin}>
            <div className="mb-4">
                <label htmlFor="email" className="block mb-2 text-white">
                Correo Electrónico
                </label>
                <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 p-2 rounded-lg text-white"
                required
                />
            </div>
            <div className="mb-6">
                <label htmlFor="password" className="block mb-2 text-white">
                Contraseña
                </label>
                <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 p-2 rounded-lg text-white"
                required
                />
            </div>

            <button
                type="submit"
                style={{ backgroundColor: primaryColor }}
                className="w-full text-gray-900 font-bold py-3 rounded-lg"
            >
                Iniciar Sesión
            </button>

            {error && (
                <p className="mt-4 text-center text-red-400">{error}</p>
            )}
            </form>
        </div>
    </div>
  );
};

export default LoginScreen;

