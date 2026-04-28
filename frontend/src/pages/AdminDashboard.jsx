import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { adminAPI } from '../services/api';
import socketService from '../services/socket';
import { useToast } from '../components/Toast';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('bulk');
  const [bulkData, setBulkData] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);

  const toast = useToast();

  useEffect(() => {
    fetchStats();
    if (activeTab === 'buses') fetchBuses();
    if (activeTab === 'drivers') fetchDrivers();
    if (activeTab === 'routes') fetchRoutes();
  }, [activeTab]);

  // 🚨 SOS LISTENER
  useEffect(() => {
    socketService.connect();

    socketService.onSOSAlert((data) => {
      toast.error(`🚨 SOS from ${data.name}`);

      alert(`
🚨 SOS ALERT!
Student: ${data.name}
Latitude: ${data.lat}
Longitude: ${data.lng}
      `);

      console.log("SOS Received:", data);
    });

    return () => {
      socketService.off('SOS_ALERT');
    };
  }, []);

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchBuses = async () => {
    try {
      const response = await adminAPI.getBuses();
      setBuses(response.data);
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await adminAPI.getDrivers();
      setDrivers(response.data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const fetchRoutes = async () => {
    try {
      const response = await adminAPI.getRoutes();
      setRoutes(response.data);
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkData.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await adminAPI.bulkEntry(bulkData);
      setResult(response.data);
      fetchStats();
      setBulkData('');
    } catch (error) {
      setResult({
        error: true,
        message: error.response?.data?.message || 'Failed to process bulk entry'
      });
    }

    setLoading(false);
  };

  const sampleData = `UK07PA1696 | Sunil Kumar | 7060226291 | Clock Tower- Darshanlal Chowk- ISBT- GEU`;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded shadow">
              Drivers: {stats.totalDrivers}
            </div>
            <div className="bg-white p-4 rounded shadow">
              Buses: {stats.totalBuses}
            </div>
            <div className="bg-white p-4 rounded shadow">
              Routes: {stats.totalRoutes}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-4">
          {['bulk', 'buses', 'drivers', 'routes'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`mr-2 px-4 py-2 rounded ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Bulk Entry */}
        {activeTab === 'bulk' && (
          <form onSubmit={handleBulkSubmit}>
            <textarea
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              rows={6}
              className="w-full border p-2 rounded"
              placeholder="Enter bulk data..."
            />

            <button
              type="submit"
              className="mt-2 px-4 py-2 bg-green-600 text-white rounded"
            >
              Submit
            </button>
          </form>
        )}

        {/* Buses */}
        {activeTab === 'buses' && (
          <div>
            {buses.map(bus => (
              <div key={bus._id} className="p-3 border mb-2 rounded">
                {bus.busNumber} - {bus.driverId?.name}
              </div>
            ))}
          </div>
        )}

        {/* Drivers */}
        {activeTab === 'drivers' && (
          <div>
            {drivers.map(driver => (
              <div key={driver._id} className="p-3 border mb-2 rounded">
                {driver.name} - {driver.phoneNumber}
              </div>
            ))}
          </div>
        )}

        {/* Routes */}
        {activeTab === 'routes' && (
          <div>
            {routes.map(route => (
              <div key={route._id} className="p-3 border mb-2 rounded">
                {route.routeName}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
