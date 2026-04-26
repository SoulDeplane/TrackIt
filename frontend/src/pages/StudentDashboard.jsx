import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import Navbar from '../components/Navbar';
import { trackingAPI } from '../services/api';
import socketService from '../services/socket';

const containerStyle = { width: '100%', height: '100%' };
const center = { lat: 30.3165, lng: 78.0322 }; // Dehradun

const StudentDashboard = () => {
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

  const onUnmount = useCallback(function callback(map) {
    setMap(null);
  }, []);

  // Fetch routes and setup sockets on mount
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

  // Handle Route Selection - Includes isLoaded to prevent race conditions
  useEffect(() => {
    if (selectedRoute && isLoaded) {
      fetchBusesByRoute(selectedRoute);
      fetchAndDrawRoute(selectedRoute);
    } else if (!selectedRoute) {
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
        
        // Append Dehradun, India to force accurate real-world road mapping
        const origin = `${route.stops[0].name}, Dehradun, India`;
        const destination = `${route.stops[route.stops.length - 1].name}, Dehradun, India`;
        
        const waypoints = route.stops.slice(1, -1).map(stop => ({
          location: `${stop.name}, Dehradun, India`,
          stopover: true
        }));

        // Request the route and catch any errors (like ZERO_RESULTS)
        directionsService.route(
          {
            origin: origin,
            destination: destination,
            waypoints: waypoints,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK) {
              setDirectionsResponse(result);
            } else {
              console.error(`Directions request failed due to ${status}`);
              alert(`Could not draw route. Google Maps couldn't find one of the stops. Error: ${status}. Check the stop names in the Admin Dashboard.`);
              setDirectionsResponse(null);
            }
          }
        );
      }
    } catch (error) {
      console.error('Error fetching route details:', error);
    }
  };

  const getSelectedRouteName = () => {
    const route = routes.find(r => r._id === selectedRoute);
    return route ? route.routeName : '';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <div className="w-full lg:w-96 bg-white shadow-lg overflow-y-auto z-10">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold text-gray-800 mb-4">Track Buses</h1>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Route</label>
              <select
                value={selectedRoute}
                onChange={(e) => {
                  setSelectedRoute(e.target.value);
                  setSelectedBus(null);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="">-- Select a Route --</option>
                {routes.map(route => (
                  <option key={route._id} value={route._id}>
                    {route.routeNumber} - {route.routeName}
                  </option>
                ))}
              </select>
            </div>
            {selectedRoute && <p className="text-sm text-gray-500">Route: {getSelectedRouteName()}</p>}
          </div>

          {/* Bus List */}
          {selectedRoute && (
            <div className="p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Buses on this Route ({buses.length})</h2>
              {buses.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No buses on this route</p>
              ) : (
                <div className="space-y-3">
                  {buses.map(bus => (
                    <div 
                      key={bus._id} 
                      onClick={() => setSelectedBus(bus)} 
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedBus?._id === bus._id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-800">{bus.busNumber}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${bus.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {bus.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Driver: {bus.driverId?.name}</p>
                        <p>Seats: {busLocations[bus._id]?.availableSeats ?? bus.availableSeats}/{bus.totalSeats}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Bus Details */}
          {selectedBus && (
            <div className="p-4 border-t bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Bus Details</h3>
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bus Number</span>
                    <span className="font-semibold">{selectedBus.busNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Driver Name</span>
                    <span className="font-semibold">{selectedBus.driverId?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone</span>
                    <a href={`tel:${selectedBus.driverId?.phoneNumber}`} className="font-semibold text-primary-600 hover:underline">
                      {selectedBus.driverId?.phoneNumber}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Available Seats</span>
                    <span className="font-semibold">
                      {busLocations[selectedBus._id]?.availableSeats ?? selectedBus.availableSeats} / {selectedBus.totalSeats}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={`font-semibold ${selectedBus.isActive ? 'text-green-600' : 'text-gray-600'}`}>
                      {selectedBus.isActive ? 'On Trip' : 'Not Active'}
                    </span>
                  </div>
                </div>
                {selectedBus.driverId?.phoneNumber && (
                  <a
                    href={`tel:${selectedBus.driverId.phoneNumber}`}
                    className="mt-4 w-full block text-center py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Call Driver
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Map Area */}
        <div className="flex-1 relative z-0">
          {!isLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={13}
              onLoad={onLoad}
              onUnmount={onUnmount}
              options={{
                mapTypeControl: false,
                streetViewControl: false,
              }}
            >
              {/* Draw Route Line */}
              {directionsResponse && (
                <DirectionsRenderer 
                  directions={directionsResponse} 
                  options={{
                    suppressMarkers: false, 
                    polylineOptions: {
                      strokeColor: '#3b82f6',
                      strokeWeight: 5,
                      strokeOpacity: 0.8
                    }
                  }}
                />
              )}

              {/* Draw Live Buses */}
              {buses.map(bus => {
                const lat = busLocations[bus._id]?.lat || bus.currentLocation?.lat;
                const lng = busLocations[bus._id]?.lng || bus.currentLocation?.lng;
                
                if (!lat || !lng) return null;

                return (
                  <Marker
                    key={bus._id}
                    position={{ lat, lng }}
                    icon={{
                      url: '/bus.svg',
                      scaledSize: new window.google.maps.Size(40, 40)
                    }}
                    onClick={() => setSelectedBus(bus)}
                  />
                );
              })}
            </GoogleMap>
          )}

          {!selectedRoute && isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10 pointer-events-none">
              <div className="text-center bg-white p-6 rounded-lg shadow-lg">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="text-gray-600 font-medium">Select a route from the sidebar to view buses</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;