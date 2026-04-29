import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { driverAPI } from '../services/api';
import socketService from '../services/socket';

const DriverDashboard = () => {
  const [bus, setBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tripActive, setTripActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [availableSeats, setAvailableSeats] = useState(40);
  const [locationStatus, setLocationStatus] = useState('idle');
  const watchIdRef = useRef(null);

  useEffect(() => {
    fetchMyBus();
    socketService.connect();

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      socketService.disconnect();
    };
  }, []);

  const fetchMyBus = async () => {
    try {
      const response = await driverAPI.getMyBus();
      setBus(response.data);
      setTripActive(response.data.isActive);
      setAvailableSeats(response.data.availableSeats);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch bus details');
    }
    setLoading(false);
  };

  const startTrip = async () => {
    try {
      await driverAPI.startTrip();
      setTripActive(true);
      socketService.emitTripStarted(bus._id);
      startLocationTracking();
    } catch (error) {
      alert('Failed to start trip');
    }
  };

  const stopTrip = async () => {
    try {
      await driverAPI.stopTrip();
      setTripActive(false);
      socketService.emitTripStopped(bus._id);
      stopLocationTracking();
    } catch (error) {
      alert('Failed to stop trip');
    }
  };

  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLocationStatus('tracking');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });

        socketService.sendLocation({
          busId: bus._id,
          lat: latitude,
          lng: longitude,
          availableSeats
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationStatus('error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  };

  const stopLocationTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLocationStatus('idle');
  };

  const updateSeats = async (value) => {
    const newSeats = Math.max(0, Math.min(bus.totalSeats, value));
    setAvailableSeats(newSeats);
    
    try {
      await driverAPI.updateSeats(newSeats);
      
      if (tripActive && currentLocation) {
        socketService.sendLocation({
          busId: bus._id,
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          availableSeats: newSeats
        });
      }
    } catch (error) {
      console.error('Failed to update seats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-red-50 text-red-600 p-6 rounded-lg text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-semibold mb-2">No Bus Assigned</h2>
            <p>{error}</p>
            <p className="mt-4 text-sm">Please contact the administrator to assign a bus to your account.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Driver Dashboard</h1>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">My Bus</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Bus Number</p>
                <p className="text-2xl font-bold text-gray-800">{bus.busNumber}</p>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Route</p>
                <p className="text-lg font-semibold text-primary-600">{bus.routeId?.routeNumber}</p>
                <p className="text-sm text-gray-600 truncate">{bus.routeId?.routeName}</p>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  tripActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'
                }`}>
                  {tripActive ? 'Trip Active' : 'Trip Inactive'}
                </span>
              </div>
            </div>

            {bus.routeId?.stops && (
              <div className="mt-6">
                <p className="text-sm text-gray-500 mb-2">Route Stops:</p>
                <div className="flex flex-wrap gap-2">
                  {bus.routeId.stops.map((stop, index) => (
                    <span key={index} className="px-3 py-1 bg-primary-50 text-primary-700 text-sm rounded-full">
                      {stop.order}. {stop.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Seat Management</h3>
          
          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={() => updateSeats(availableSeats - 1)}
              className="w-12 h-12 bg-red-100 text-red-600 rounded-full text-2xl font-bold hover:bg-red-200 transition-colors"
            >
              -
            </button>
            
            <div className="text-center">
              <p className="text-4xl font-bold text-gray-800">{availableSeats}</p>
              <p className="text-sm text-gray-500">of {bus.totalSeats} seats available</p>
            </div>
            
            <button
              onClick={() => updateSeats(availableSeats + 1)}
              className="w-12 h-12 bg-green-100 text-green-600 rounded-full text-2xl font-bold hover:bg-green-200 transition-colors"
            >
              +
            </button>
          </div>

          <div className="mt-4 bg-gray-100 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-primary-600 h-full transition-all duration-300"
              style={{ width: `${((bus.totalSeats - availableSeats) / bus.totalSeats) * 100}%` }}
            ></div>
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">
            {bus.totalSeats - availableSeats} seats occupied
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Trip Controls</h3>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={startTrip}
              disabled={tripActive}
              className={`flex-1 py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
                tripActive
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <span className="flex items-center justify-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Trip
              </span>
            </button>
            
            <button
              onClick={stopTrip}
              disabled={!tripActive}
              className={`flex-1 py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
                !tripActive
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              <span className="flex items-center justify-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop Trip
              </span>
            </button>
          </div>
        </div>

        {tripActive && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">GPS Status</h3>
            
            <div className="flex items-center space-x-4">
              <div className={`w-4 h-4 rounded-full ${
                locationStatus === 'tracking' ? 'bg-green-500 animate-pulse' : 
                locationStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
              }`}></div>
              
              <div>
                <p className="font-medium text-gray-800">
                  {locationStatus === 'tracking' ? 'GPS Active' : 
                   locationStatus === 'error' ? 'GPS Error' : 'GPS Inactive'}
                </p>
                {currentLocation && (
                  <p className="text-sm text-gray-500">
                    Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
                  </p>
                )}
              </div>
            </div>

            {locationStatus === 'tracking' && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  Your location is being shared with students and parents in real-time.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;
