import { useState, useCallback } from "react";
import { db } from "../firebase/config";
import { collection, query, orderBy, limit, startAfter, getDocs } from "firebase/firestore";

const SHIFTS_PER_PAGE = 15;

export const useShiftReports = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchInitialShifts = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "shiftReports"),
        orderBy("closedAt", "desc"),
        limit(SHIFTS_PER_PAGE)
      );
      const snapshots = await getDocs(q);
      const newShifts = snapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const lastVisible = snapshots.docs[snapshots.docs.length - 1];
      
      setShifts(newShifts);
      setLastDoc(lastVisible);
      setHasMore(snapshots.docs.length === SHIFTS_PER_PAGE);
    } catch (error) {
      console.error("Error fetching initial shifts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoreShifts = useCallback(async () => {
    if (!lastDoc || loading) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "shiftReports"),
        orderBy("closedAt", "desc"),
        startAfter(lastDoc),
        limit(SHIFTS_PER_PAGE)
      );
      const snapshots = await getDocs(q);
      const newShifts = snapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const lastVisible = snapshots.docs[snapshots.docs.length - 1];

      setShifts(prev => [...prev, ...newShifts]);
      setLastDoc(lastVisible);
      setHasMore(snapshots.docs.length === SHIFTS_PER_PAGE);
    } catch (error) {
      console.error("Error loading more shifts:", error);
    } finally {
      setLoading(false);
    }
  }, [lastDoc, loading]);

  return { shifts, loading, hasMore, fetchInitialShifts, loadMoreShifts };
};

