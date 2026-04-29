const User = require('../models/User');
const Route = require('../models/Route');
const Bus = require('../models/Bus');

const bulkEntry = async (req, res) => {
  try {
    const { data } = req.body;

    if (!data || typeof data !== 'string') {
      return res.status(400).json({ message: 'Data is required' });
    }

    const lines = data.trim().split('\n').filter(line => line.trim());
    const results = {
      total: lines.length,
      success: 0,
      failed: [],
      created: {
        drivers: 0,
        routes: 0,
        buses: 0
      }
    };

    let routeCount = await Route.countDocuments();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;

      try {
        const parts = line.split('|').map(p => p.trim());

        if (parts.length !== 4) {
          results.failed.push({
            line: lineNumber,
            content: line,
            error: 'Invalid format. Expected: RegNo | DriverName | Phone | Route'
          });
          continue;
        }

        const [regNo, driverName, phone, routeString] = parts;

        if (!regNo || !driverName || !phone || !routeString) {
          results.failed.push({
            line: lineNumber,
            content: line,
            error: 'Missing required fields'
          });
          continue;
        }

        let driver = await User.findOne({ phoneNumber: phone });

        if (!driver) {
          const emailBase = driverName.toLowerCase().replace(/\s+/g, '.');
          const email = `${emailBase}@trackit.com`;

          let finalEmail = email;
          const emailExists = await User.findOne({ email });
          if (emailExists) {
            finalEmail = `${emailBase}.${Date.now()}@trackit.com`;
          }

          driver = await User.create({
            name: driverName,
            email: finalEmail,
            password: 'driver123',
            role: 'driver',
            phoneNumber: phone
          });
          results.created.drivers++;
        }

        const normalizedRouteName = routeString.trim();
        let route = await Route.findOne({ routeName: normalizedRouteName });

        if (!route) {
          const stopNames = normalizedRouteName.split('-').map(s => s.trim()).filter(s => s);

          const stops = stopNames.map((name, index) => ({
            name,
            lat: 30.3165 + index * 0.001,
            lng: 78.0322 + index * 0.001,
            order: index + 1
          }));

          routeCount++;
          route = await Route.create({
            routeNumber: `R${routeCount}`,
            routeName: normalizedRouteName,
            stops
          });
          results.created.routes++;
        }

        const existingBus = await Bus.findOne({ busNumber: regNo });

        if (existingBus) {
          results.failed.push({
            line: lineNumber,
            content: line,
            error: `Bus ${regNo} already exists`
          });
          continue;
        }

        await Bus.create({
          busNumber: regNo,
          driverId: driver._id,
          routeId: route._id,
          totalSeats: 40,
          availableSeats: 40
        });
        results.created.buses++;
        results.success++;

      } catch (error) {
        results.failed.push({
          line: lineNumber,
          content: line,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Bulk entry processed',
      results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAllDrivers = async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver' }).select('-password');
    res.json(drivers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllBuses = async (req, res) => {
  try {
    const buses = await Bus.find()
      .populate('driverId', 'name phoneNumber email')
      .populate('routeId', 'routeNumber routeName stops');
    res.json(buses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllRoutes = async (req, res) => {
  try {
    const routes = await Route.find();
    res.json(routes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getStats = async (req, res) => {
  try {
    const totalDrivers = await User.countDocuments({ role: 'driver' });
    const totalBuses = await Bus.countDocuments();
    const totalRoutes = await Route.countDocuments();
    const activeBuses = await Bus.countDocuments({ isActive: true });
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalParents = await User.countDocuments({ role: 'parent' });

    res.json({
      totalDrivers,
      totalBuses,
      totalRoutes,
      activeBuses,
      totalStudents,
      totalParents
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  bulkEntry,
  getAllDrivers,
  getAllBuses,
  getAllRoutes,
  getStats
};
