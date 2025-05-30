// public/js/main.js
console.log("main.js loaded");

// Lấy token từ localStorage (sau này khi login thành công sẽ lưu token vào đây)
const token = localStorage.getItem('chatToken');

const socket = io({ // Kết nối tới server Socket.IO
    auth: { // Gửi token qua 'auth' object
        token: token
    }
});

socket.on('connect', () => {
    console.log(`[Main] Connected to Socket.IO server! Socket ID: ${socket.id}`);
    // Nếu có logic cần chạy ngay sau khi kết nối global thì làm ở đây
    // Ví dụ: nếu chatRoom.js dựa vào sự kiện 'connect' này để join phòng
});

socket.on('connect_error', (err) => {
    console.error('[Main] Global Socket connection error:', err.message);
    // Xử lý lỗi kết nối chung, ví dụ hiển thị thông báo cho người dùng
    // Nếu lỗi là do token, có thể xóa token và yêu cầu đăng nhập lại
    if (err.message.includes('Token not provided') || err.message.includes('Invalid token') || err.message.includes('Token expired')) {
        console.warn('[Main] Token authentication failed. Clearing token and redirecting to login.');
        localStorage.removeItem('chatToken');
        localStorage.removeItem('chatUser'); // Xóa cả thông tin user
        // Chỉ redirect nếu không phải đang ở trang login/register để tránh vòng lặp
        if (!window.location.pathname.startsWith('/auth')) {
            // window.location.href = '/auth/login';
            // Có thể hiển thị một modal yêu cầu đăng nhập thay vì redirect ngay
            alert("Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.");
        }
    }
});


socket.on('disconnect', (reason) => {
    console.log('Đã ngắt kết nối khỏi server Socket.IO:', reason);
});

// --- Phần test chat cơ bản (sẽ được chuyển vào các file JS chuyên biệt sau) ---
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomNameInput = document.getElementById('roomNameInput');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const messagesDiv = document.getElementById('messages');

let currentRoomId = null;

if (joinRoomBtn) {
    joinRoomBtn.addEventListener('click', () => {
        const roomIdToJoin = roomNameInput.value.trim();
        if (roomIdToJoin) {
            console.log(`Attempting to join room: ${roomIdToJoin}`);
            socket.emit('joinRoom', { roomId: roomIdToJoin }); // roomId nên là ID, không phải tên
                                                            // Tạm thời dùng tên để test
        }
    });
}

if (sendMessageBtn) {
    sendMessageBtn.addEventListener('click', () => {
        const messageText = messageInput.value.trim();
        if (messageText && currentRoomId) {
            socket.emit('sendMessage', { roomId: currentRoomId, text: messageText });
            messageInput.value = '';
        } else if (!currentRoomId) {
            console.warn("Chưa tham gia phòng nào để gửi tin nhắn.");
            alert("Bạn cần tham gia một phòng trước khi gửi tin nhắn.");
        }
    });
}

// Lắng nghe sự kiện join thành công
socket.on('joinSuccess', (data) => {
    console.log(`Successfully joined room: ${data.roomName} (ID: ${data.roomId})`);
    messagesDiv.innerHTML = `<h3>Chào mừng đến với phòng ${data.roomName}</h3>`; // Xóa tin nhắn cũ
    currentRoomId = data.roomId; // Lưu lại ID phòng hiện tại
    document.getElementById('chatArea').style.display = 'block'; // Hiển thị khu vực chat
    if(roomNameInput) roomNameInput.value = data.roomName; // Cập nhật tên phòng trên input
});


// Lắng nghe tin nhắn mới
socket.on('newMessage', (message) => {
    console.log('New message received:', message);
    const messageElement = document.createElement('div');
    const userDisplay = message.user ? message.user.username : 'Unknown User';
    const avatar = message.user && message.user.avatar ? `<img src="<span class="math-inline">\{message\.user\.avatar\}" alt\="</span>{userDisplay}" width="30" height="30" style="border-radius: 50%; margin-right: 5px;">` : '';
    messageElement.innerHTML = `<span class="math-inline">\{avatar\}<strong\></span>{userDisplay}:</strong> <span class="math-inline">\{message\.text\} <small\>\(</span>{new Date(message.timestamp).toLocaleTimeString()})</small>`;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Cuộn xuống tin nhắn mới nhất
});

// Lắng nghe thông báo user tham gia
socket.on('userJoined', (data) => {
    console.log('User joined:', data);
    const noticeElement = document.createElement('div');
    noticeElement.style.fontStyle = 'italic';
    noticeElement.style.color = 'green';
    noticeElement.textContent = data.message;
    messagesDiv.appendChild(noticeElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Lắng nghe thông báo user rời phòng
socket.on('userLeft', (data) => {
    console.log('User left:', data);
    const noticeElement = document.createElement('div');
    noticeElement.style.fontStyle = 'italic';
    noticeElement.style.color = 'orange';
    noticeElement.textContent = data.message;
    messagesDiv.appendChild(noticeElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Lắng nghe tin nhắn cũ
socket.on('loadMessages', (messages) => {
    console.log('Loading old messages:', messages);
    messages.forEach(message => {
        const messageElement = document.createElement('div');
        const userDisplay = message.User ? message.User.username : (message.sender ? message.sender.username : 'Unknown User');
        const avatarPath = message.User ? message.User.avatar : (message.sender ? message.sender.avatar : null);
        const avatar = avatarPath ? `<img src="<span class="math-inline">\{avatarPath\.startsWith\('http'\) ? avatarPath \: '/' \+ avatarPath\}" alt\="</span>{userDisplay}" width="30" height="30" style="border-radius: 50%; margin-right: 5px;">` : '';
        messageElement.innerHTML = `<span class="math-inline">\{avatar\}<strong\></span>{userDisplay}:</strong> <span class="math-inline">\{message\.text\} <small\>\(</span>{new Date(message.createdAt).toLocaleTimeString()})</small>`;
        messagesDiv.appendChild(messageElement);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Cuộn xuống dưới cùng
});

socket.on('error', (errorData) => {
    console.error('Server error:', errorData.message);
    alert(`Lỗi từ server: ${errorData.message}`);
});

socket.on('spamWarning', (data) => {
    console.warn('Spam warning:', data.message);
    alert(data.message);
});





