require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const driverRoutes = require('./routes/driver');
const trackingRoutes = require('./routes/tracking');
const sosRoutes = require('./routes/sos');

const Location = require('./models/Location');
const Bus = require('./models/Bus');
const User = require('./models/User');

connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/sos', sosRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('sendLocation', async (data) => {
    try {
      const { busId, lat, lng, availableSeats } = data;

      await Location.create({ busId, lat, lng });

      if (availableSeats !== undefined) {
        await Bus.findByIdAndUpdate(busId, { availableSeats });
      }

      io.emit('receiveLocation', {
        busId,
        lat,
        lng,
        availableSeats,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error saving location:', error);
      socket.emit('locationError', { message: 'Failed to save location' });
    }
  });

  socket.on('tripStarted', async ({ busId }) => {
    try {
      await Bus.findByIdAndUpdate(busId, { isActive: true });
      io.emit('busStatusChanged', { busId, isActive: true });
    } catch (error) {
      console.error('Error starting trip:', error);
    }
  });

  socket.on('tripStopped', async ({ busId }) => {
    try {
      await Bus.findByIdAndUpdate(busId, { isActive: false });
      io.emit('busStatusChanged', { busId, isActive: false });
    } catch (error) {
      console.error('Error stopping trip:', error);
    }
  });

  socket.on('SOS_ALERT', (data) => {
    console.log('SOS received via socket:', data);
    io.emit('SOS_ALERT', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });

    if (!adminExists) {
      await User.create({
        name: 'Admin',
        email: 'admin@trackit.com',
        password: 'admin123',
        role: 'admin',
        phoneNumber: '0000000000'
      });

      console.log('Default admin created: admin@trackit.com / admin123');
    }
  } catch (error) {
    console.error('Error creating admin:', error);
  }
};

createDefaultAdmin();

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
