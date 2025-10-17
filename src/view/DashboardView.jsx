import React, { useEffect, useState, useMemo } from "react";
import { db } from "../firebase/config";
import { collection, query, where, Timestamp, getDocs } from "firebase/firestore";
import { useRestaurant } from '../contexts/RestaurantContext';
import { useInventory } from '../contexts/InventoryContext';
import { 
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import SalesReport from './dashboard/SalesReport';
import PerformanceReport from './dashboard/PerformanceReport';

// --- Componentes de UI Internos ---
const FilterButton = ({ value, label, timeRange, setTimeRange }) => ( 
    <button 
        onClick={() => setTimeRange(value)} 
        className={`px-4 py-1 rounded-lg text-sm font-semibold transition ${
            timeRange === value 
            ? 'bg-[var(--primary-color)] text-gray-900' 
            : 'bg-gray-700 hover:bg-gray-600'
        }`}
    > 
        {label} 
    </button> 
);

const DashboardCard = ({ title, value, colorClass = 'text-white' }) => (
    <div className="bg-gray-800 p-4 rounded-lg text-center shadow-md">
        <h2 className="font-bold text-gray-400">{title}</h2>
        <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
    </div>
);

const DashboardView = () => {
  const { restaurant } = useRestaurant();
  const { ingredients, loading: inventoryLoading } = useInventory();
  const [sales, setSales] = useState([]);
  const [movements, setMovements] = useState([]);
  const [timeRange, setTimeRange] = useState('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const getDates = () => {
        const now = new Date();
        let start = new Date();
        start.setHours(0,0,0,0);
        const end = new Date();
        end.setHours(23,59,59,999);
        if (timeRange === 'week') start.setDate(now.getDate() - 6);
        if (timeRange === 'month') start.setDate(now.getDate() - 30);
        return { start, end };
    }
    const { start, end } = getDates();

    const fetchData = async () => {
        try {
            const qSales = query(collection(db, "orders"), where("createdAt", ">=", Timestamp.fromDate(start)), where("createdAt", "<=", Timestamp.fromDate(end)));
            const salesSnapshot = await getDocs(qSales);
            setSales(salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            
            const qMov = query(collection(db, "movements"), where("createdAt", ">=", Timestamp.fromDate(start)), where("createdAt", "<=", Timestamp.fromDate(end)));
            const movSnapshot = await getDocs(qMov);
            setMovements(movSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) { console.error("Error fetching dashboard data:", error); } 
        finally { setLoading(false); }
    }
    fetchData();
  }, [timeRange]);

  const totalSales = useMemo(() => sales.reduce((acc, order) => acc + (order.totals?.finalTotal || 0), 0), [sales]);
  const income = useMemo(() => movements.filter(m => m.type === "income").reduce((acc, m) => acc + m.amount, 0), [movements]);
  const expense = useMemo(() => movements.filter(m => m.type === "expense").reduce((acc, m) => acc + m.amount, 0), [movements]);

  const salesByProductData = useMemo(() => {
    const productCount = {};
    sales.forEach(order => {
        if(order.items) {
            order.items.forEach(item => { 
                productCount[item.name] = (productCount[item.name] || 0) + item.quantity; 
            });
        }
    });
    return Object.entries(productCount).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [sales]);

  const pieChartData = useMemo(() => {
      if (salesByProductData.length <= 5) {
          return salesByProductData;
      }
      const top5 = salesByProductData.slice(0, 5);
      const othersValue = salesByProductData.slice(5).reduce((acc, item) => acc + item.value, 0);
      return [...top5, { name: 'Otros', value: othersValue }];
  }, [salesByProductData]);

  const suggestedProducts = useMemo(() => {
    if (!restaurant?.products || !ingredients || ingredients.length === 0) return [];
    
    return restaurant.products.filter(product => 
        !product.isHiddenInPOS && 
        // --- CORRECCIÓN CLAVE ---
        // Se usa 'product.recipe?.' para evitar el error si 'recipe' es undefined.
        product.recipe?.every(recipeItem => {
            const stock = ingredients.find(inv => inv.id === recipeItem.id)?.stock || 0;
            return stock >= (recipeItem.quantity * 10);
        })
    ).slice(0, 3);
  }, [restaurant, ingredients]);
  
  const COLORS = ["#FF8042", "#0088FE", "#00C49F", "#FFBB28", "#AF19FF", "#A9A9A9"];

  if (loading || inventoryLoading) {
      return <p className="text-center p-10">Cargando datos del dashboard...</p>;
  }

  return (
    <div className="text-white p-6 space-y-8">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">📊 Dashboard</h1>
            <div className="flex gap-2"> 
                <FilterButton value="today" label="Hoy" timeRange={timeRange} setTimeRange={setTimeRange} /> 
                <FilterButton value="week" label="7 Días" timeRange={timeRange} setTimeRange={setTimeRange} /> 
                <FilterButton value="month" label="30 Días" timeRange={timeRange} setTimeRange={setTimeRange} /> 
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DashboardCard title="Ventas Totales" value={`$${totalSales.toFixed(2)}`} colorClass="text-yellow-400" />
            <DashboardCard title="Ingresos Extra" value={`$${income.toFixed(2)}`} colorClass="text-green-400" />
            <DashboardCard title="Egresos" value={`$${expense.toFixed(2)}`} colorClass="text-red-400" />
        </div>

        {/* --- NUEVA SECCIÓN DE ANÁLISIS DE PRODUCTOS --- */}
        <section className="bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-yellow-400 border-b-2 border-gray-700 pb-3 mb-6">Análisis de Productos Vendidos</h3>
            {salesByProductData.length === 0 ? (<p className="text-gray-500 text-center py-10">No hay ventas de productos en este periodo.</p>) : (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
                    <div className="lg:col-span-2">
                        <h4 className="font-semibold text-center mb-4">Top 5 + Otros</h4>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                    {pieChartData.map((e, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{backgroundColor: '#2d3748', border: 'none', borderRadius: '8px'}} itemStyle={{color: '#fff'}} />
                                <Legend iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="lg:col-span-3">
                         <h4 className="font-semibold text-center mb-4">Ventas por Producto (General)</h4>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={salesByProductData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                                <XAxis type="number" stroke="#9ca3af" />
                                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                <Tooltip contentStyle={{backgroundColor: '#2d3748', border: 'none', borderRadius: '8px'}} itemStyle={{color: '#fff'}} cursor={{fill: 'rgba(255,255,255,0.1)'}} />
                                <Bar dataKey="value" name="Cantidad Vendida" fill="#FF8042" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <SalesReport />
            </div>
            <div className="space-y-6">
                <section className="bg-gray-800 p-6 rounded-lg shadow-md"><h3 className="text-xl font-bold text-yellow-400 border-b-2 border-gray-700 pb-3 mb-4">💡 Oportunidades de Venta</h3><div className="space-y-4">{suggestedProducts.length > 0 ? suggestedProducts.map(p => <div key={p.id} className="flex items-center gap-4"><img src={p.image || 'https://placehold.co/64x64/2d3748/ffffff?text=?'} className="w-12 h-12 rounded-md object-cover" /><p className="font-semibold">{p.name}</p></div>) : <p className="text-sm text-gray-500">No hay sugerencias por ahora.</p>}</div></section>
                <PerformanceReport />
            </div>
        </div>
    </div>
  );
};

export default DashboardView;

