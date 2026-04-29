const Route = require('../models/Route');
const Bus = require('../models/Bus');
const Location = require('../models/Location');

const getRoutes = async (req, res) => {
  try {
    const routes = await Route.find().select('routeNumber routeName');
    res.json(routes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getBusesByRoute = async (req, res) => {
  try {
    const { routeId } = req.params;

    const buses = await Bus.find({ routeId })
      .populate('driverId', 'name phoneNumber')
      .populate('routeId', 'routeNumber routeName stops');

    res.json(buses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getActiveBuses = async (req, res) => {
  try {
    const buses = await Bus.find({ isActive: true })
      .populate('driverId', 'name phoneNumber')
      .populate('routeId', 'routeNumber routeName stops');

    const busesWithLocation = await Promise.all(
      buses.map(async (bus) => {
        const latestLocation = await Location.findOne({ busId: bus._id })
          .sort({ timestamp: -1 })
          .limit(1);

        return {
          ...bus.toObject(),
          currentLocation: latestLocation
        };
      })
    );

    res.json(busesWithLocation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getBusDetails = async (req, res) => {
  try {
    const { busId } = req.params;

    const bus = await Bus.findById(busId)
      .populate('driverId', 'name phoneNumber')
      .populate('routeId', 'routeNumber routeName stops');

    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    const latestLocation = await Location.findOne({ busId })
      .sort({ timestamp: -1 })
      .limit(1);

    res.json({
      ...bus.toObject(),
      currentLocation: latestLocation
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRouteDetails = async (req, res) => {
  try {
    const { routeId } = req.params;

    const route = await Route.findById(routeId);

    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    res.json(route);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getRoutes,
  getBusesByRoute,
  getActiveBuses,
  getBusDetails,
  getRouteDetails
};
