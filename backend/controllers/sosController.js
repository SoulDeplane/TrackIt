const User = require('../models/User');

const sendSOS = async (req, res) => {
  try {
    const { lat, lng, busId } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Location required' });
    }

    const student = await User.findById(req.user._id);

    if (!student) {
      return res.status(404).json({ message: 'User not found' });
    }

    const sosData = {
      studentId: student._id,
      name: student.name,
      phoneNumber: student.phoneNumber,
      lat,
      lng,
      busId: busId || null,
      timestamp: new Date()
    };

    console.log('SOS Triggered:', sosData);

    req.io.emit('SOS_ALERT', sosData);

    res.json({
      message: 'SOS sent successfully',
      data: sosData
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { sendSOS };
