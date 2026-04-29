import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import Navbar from '../components/Navbar';
import { trackingAPI } from '../services/api';
import socketService from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const containerStyle = { width: '100%', height: '100%' };
const center = { lat: 30.3165, lng: 78.0322 };

const StudentDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  const [map, setMap] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busLocations, setBusLocations] = useState({});
  const [directionsResponse, setDirectionsResponse] = useState(null);

  const onLoad = useCallback(function callback(map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  const handleSOS = () => {
    if (!navigator.geolocation) {
      toast.error("Location not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const data = {
          studentId: user._id,
          name: user.name,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date(),
          busId: selectedBus?._id || null
        };

        socketService.socket.emit('SOS_ALERT', data);

        toast.success("🚨 SOS sent successfully!");
      },
      () => {
        toast.error("Unable to get location");
      }
    );
  };

  useEffect(() => {
    fetchRoutes();
    socketService.connect();

    socketService.onReceiveLocation((data) => {
      setBusLocations(prev => ({
        ...prev,
        [data.busId]: {
          lat: data.lat,
          lng: data.lng,
          availableSeats: data.availableSeats,
          timestamp: data.timestamp
        }
      }));
    });

    socketService.onBusStatusChanged((data) => {
      setBuses(prev => prev.map(bus =>
        bus._id === data.busId ? { ...bus, isActive: data.isActive } : bus
      ));
    });

    return () => {
      socketService.off('receiveLocation');
      socketService.off('busStatusChanged');
      socketService.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedRoute && isLoaded) {
      fetchBusesByRoute(selectedRoute);
      fetchAndDrawRoute(selectedRoute);
    } else {
      setBuses([]);
      setDirectionsResponse(null);
    }
  }, [selectedRoute, isLoaded]);

  const fetchRoutes = async () => {
    try {
      const response = await trackingAPI.getRoutes();
      setRoutes(response.data);
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
    setLoading(false);
  };

  const fetchBusesByRoute = async (routeId) => {
    try {
      const response = await trackingAPI.getBusesByRoute(routeId);
      setBuses(response.data);
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const fetchAndDrawRoute = async (routeId) => {
    try {
      const response = await trackingAPI.getRouteDetails(routeId);
      const route = response.data;

      if (route.stops && route.stops.length >= 2) {
        const directionsService = new window.google.maps.DirectionsService();

        const origin = `${route.stops[0].name}, Dehradun, India`;
        const destination = `${route.stops[route.stops.length - 1].name}, Dehradun, India`;

        const waypoints = route.stops.slice(1, -1).map(stop => ({
          location: `${stop.name}, Dehradun, India`,
          stopover: true
        }));

        directionsService.route(
          {
            origin,
            destination,
            waypoints,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK) {
              setDirectionsResponse(result);
            } else {
              alert("Could not draw route");
              setDirectionsResponse(null);
            }
          }
        );
      }
    } catch (error) {
      console.error('Error fetching route details:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">

        <div className="w-full lg:w-96 bg-white shadow-lg p-4">

          <h1 className="text-xl font-bold mb-4">Track Buses</h1>

          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="w-full p-2 border rounded mb-4"
          >
            <option value="">Select Route</option>
            {routes.map(route => (
              <option key={route._id} value={route._id}>
                {route.routeName}
              </option>
            ))}
          </select>

          <button
            onClick={handleSOS}
            className="w-full mt-4 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition"
          >
            🚨 SEND SOS
          </button>

          <div className="mt-4 space-y-2">
            {buses.map(bus => (
              <div
                key={bus._id}
                onClick={() => setSelectedBus(bus)}
                className="p-3 border rounded cursor-pointer"
              >
                <p className="font-semibold">{bus.busNumber}</p>
                <p className="text-sm">{bus.driverId?.name}</p>
              </div>
            ))}
          </div>

        </div>

        <div className="flex-1">
          {isLoaded && (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={13}
              onLoad={onLoad}
              onUnmount={onUnmount}
            >
              {directionsResponse && (
                <DirectionsRenderer directions={directionsResponse} />
              )}

              {buses.map(bus => {
                const loc = busLocations[bus._id];
                if (!loc) return null;

                return (
                  <Marker
                    key={bus._id}
                    position={{ lat: loc.lat, lng: loc.lng }}
                  />
                );
              })}
            </GoogleMap>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
