import { useState, useCallback } from "react";
import { db } from "../firebase/config";
import { collection, query, orderBy, limit, startAfter, getDocs } from "firebase/firestore";

const ORDERS_PER_PAGE = 20;

export const usePaginatedOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchInitialOrders = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "orders"),
        orderBy("createdAt", "desc"),
        limit(ORDERS_PER_PAGE)
      );
      const snapshots = await getDocs(q);
      const newOrders = snapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const lastVisible = snapshots.docs[snapshots.docs.length - 1];
      
      setOrders(newOrders);
      setLastDoc(lastVisible);
      setHasMore(snapshots.docs.length === ORDERS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching initial orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoreOrders = useCallback(async () => {
    if (!lastDoc || loading) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "orders"),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(ORDERS_PER_PAGE)
      );
      const snapshots = await getDocs(q);
      const newOrders = snapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const lastVisible = snapshots.docs[snapshots.docs.length - 1];

      setOrders(prev => [...prev, ...newOrders]);
      setLastDoc(lastVisible);
      setHasMore(snapshots.docs.length === ORDERS_PER_PAGE);
    } catch (error) {
      console.error("Error loading more orders:", error);
    } finally {
      setLoading(false);
    }
  }, [lastDoc, loading]);

  return { orders, loading, hasMore, fetchInitialOrders, loadMoreOrders };
};

