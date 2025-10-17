import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
// CORRECCIÓN: Importamos 'auth' y 'db' directamente, no 'app'
import { auth, db } from "../firebase/config.jsx";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState([]);

  // Ya no necesitamos getAuth(app) ni getFirestore(app) aquí, porque ya los importamos inicializados.

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const fetchUsers = useCallback(async () => {
    const usersCollection = collection(db, "users");
    const usersSnapshot = await getDocs(usersCollection);
    const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setUsersList(usersData);
  }, []); // db es estable, no necesita ser dependencia

  const updateUserRole = useCallback(async (uid, newRole) => {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { role: newRole });
    await fetchUsers();
  }, [fetchUsers]);

  const deleteUserRecord = useCallback(async (uid) => {
    const userRef = doc(db, "users", uid);
    await deleteDoc(userRef);
    await fetchUsers();
  }, [fetchUsers]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            setRole(userSnap.data().role || "empleado");
          } else {
            await setDoc(userRef, { email: currentUser.email, role: "empleado" });
            setRole("empleado");
          }
        } catch (error) {
          console.error("Error obteniendo rol:", error);
          setRole("empleado");
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []); // auth y db son estables, no necesitan ser dependencias

  const value = { 
      user, 
      role, 
      loading, 
      logout,
      usersList,
      fetchUsers,
      updateUserRole,
      deleteUserRecord
    };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

