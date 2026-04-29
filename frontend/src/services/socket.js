import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  socket = null;

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['polling', 'websocket']
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket.id);
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendLocation(data) {
    if (this.socket) {
      this.socket.emit('sendLocation', data);
    }
  }

  emitTripStarted(busId) {
    if (this.socket) {
      this.socket.emit('tripStarted', { busId });
    }
  }

  emitTripStopped(busId) {
    if (this.socket) {
      this.socket.emit('tripStopped', { busId });
    }
  }

  onReceiveLocation(callback) {
    if (this.socket) {
      this.socket.on('receiveLocation', callback);
    }
  }

  onBusStatusChanged(callback) {
    if (this.socket) {
      this.socket.on('busStatusChanged', callback);
    }
  }

  onSOSAlert(callback) {
    if (this.socket) {
      this.socket.on('SOS_ALERT', callback);
    }
  }

  off(event) {
    if (this.socket) {
      this.socket.off(event);
    }
  }
}

export default new SocketService();
