import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to Socket.IO real-time server:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('⚡ Disconnected from Socket.IO server');
    });
  }
  return socket;
}

export function joinTeamRoom(team_id) {
  const s = getSocket();
  if (s && team_id) {
    s.emit('join_team', { team_id });
  }
}

export function joinAdminRoom() {
  const s = getSocket();
  if (s) {
    s.emit('join_admin');
  }
}
