const token = localStorage.getItem('token');
if (!token) window.location = '/';

const socket = io({ auth: { token } });
let currentRoom = null;

socket.on('connect', () => {
  loadRooms();
  loadFriends();
});

function loadRooms() {
  fetch('/api/rooms', { headers: { Authorization: 'Bearer ' + token } })
    .then(res => res.json())
    .then(rooms => {
      const list = document.getElementById('roomList');
      list.innerHTML = '';
      rooms.forEach(room => {
        const li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action';
        li.innerText = room.name;
        li.onclick = () => joinRoom(room.id, room.name);
        list.appendChild(li);
      });
    });
}

function joinRoom(roomId, roomName) {
  currentRoom = roomId;
  document.getElementById('currentRoomName').innerText = roomName;
  document.getElementById('chatBox').innerHTML = '';
  socket.emit('join', roomId);
  fetch(`/api/rooms/${roomId}/messages`, { headers: { Authorization: 'Bearer ' + token } })
    .then(res => res.json())
    .then(messages => {
      messages.forEach(msg => addMessage(msg.User?.username || 'Ẩn danh', msg.text, msg.createdAt));
    });
}

socket.on('history', messages => {
  messages.forEach(msg => addMessage(msg.userId, msg.text, msg.createdAt));
});

socket.on('message', data => {
  addMessage(data.from, data.text, data.timestamp);
});

socket.on('notification', msg => {
  document.getElementById('roomNotice').innerText = msg;
  setTimeout(() => document.getElementById('roomNotice').innerText = '', 3000);
});

socket.on('blocked', msg => {
  alert(msg);
});

document.getElementById('chatForm').onsubmit = e => {
  e.preventDefault();
  const text = document.getElementById('chatInput').value;
  if (!text || !currentRoom) return;
  socket.emit('message', { roomId: currentRoom, text });
  document.getElementById('chatInput').value = '';
};

function addMessage(user, text, time) {
  const box = document.getElementById('chatBox');
  const div = document.createElement('div');
  div.innerHTML = `<b>${user}</b>: ${text} <span class="text-muted small">${new Date(time).toLocaleTimeString()}</span>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

document.getElementById('createRoomForm').onsubmit = e => {
  e.preventDefault();
  const name = e.target.roomName.value;
  fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ name })
  }).then(() => {
    loadRooms();
    e.target.roomName.value = '';
  });
};

function loadFriends() {
  fetch('/api/friends', { headers: { Authorization: 'Bearer ' + token } })
    .then(res => res.json())
    .then(friends => {
      const list = document.getElementById('friendList');
      list.innerHTML = '';
      friends.forEach(f => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerText = f.friendId;
        list.appendChild(li);
      });
    });
}