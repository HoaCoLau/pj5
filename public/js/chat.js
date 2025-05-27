const token = localStorage.getItem('token'); // Lưu token sau khi đăng nhập
const socket = io({
  auth: { token }
});

let currentRoom = null;

// Join room khi chọn phòng
function joinRoom(roomId, roomName) {
  if (currentRoom) socket.emit('leave', currentRoom);
  currentRoom = roomId;
  document.getElementById('room-name').innerText = roomName;
  document.getElementById('chat-messages').innerHTML = '';
  socket.emit('join', roomId);
}

// Gửi tin nhắn
document.getElementById('chat-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (text && currentRoom) {
    socket.emit('message', { roomId: currentRoom, text });
    input.value = '';
  }
});

// Nhận tin nhắn mới
socket.on('message', (msg) => {
  const chat = document.getElementById('chat-messages');
  chat.innerHTML += `<div><b>${msg.from}:</b> ${msg.text} <span class="text-muted small">${new Date(msg.timestamp).toLocaleTimeString()}</span></div>`;
  chat.scrollTop = chat.scrollHeight;
});

// Nhận lịch sử chat
socket.on('history', (messages) => {
  const chat = document.getElementById('chat-messages');
  chat.innerHTML = '';
  messages.forEach(msg => {
    chat.innerHTML += `<div><b>${msg.User?.username || 'Ẩn danh'}:</b> ${msg.text} <span class="text-muted small">${new Date(msg.timestamp).toLocaleTimeString()}</span></div>`;
  });
  chat.scrollTop = chat.scrollHeight;
});

// Nhận thông báo join/leave
socket.on('notice', (data) => {
  const chat = document.getElementById('chat-messages');
  chat.innerHTML += `<div class="text-info"><i>${data.text}</i></div>`;
  chat.scrollTop = chat.scrollHeight;
});

// Nhận thông báo bị block do spam
socket.on('blocked', (data) => {
  alert(data.message);
});

// Xử lý lỗi kết nối
socket.on('connect_error', (err) => {
  alert('Lỗi kết nối: ' + err.message);
});