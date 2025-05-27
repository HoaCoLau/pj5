// public/js/chatRoom.js
// Biến currentRoomId, currentRoomName, currentUser đã được truyền từ EJS template
// const currentRoomId = ...;
// const currentRoomName = ...;
// const currentUser = ...;

const messageContainer = document.getElementById('messageContainer');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
// const roomNameHeader = document.getElementById('roomNameHeader'); // Nếu muốn cập nhật lại tên phòng từ server

// --- Socket Connection (sử dụng socket instance từ main.js nếu có, hoặc tạo mới) ---
// Giả sử main.js đã khởi tạo `socket` và xử lý token
// Nếu socket chưa được khởi tạo ở main.js hoặc bạn muốn quản lý riêng:
/*
const token = localStorage.getItem('chatToken');
const socket = io({
    auth: {
        token: token
    }
});

socket.on('connect', () => {
    console.log(`[ChatRoom] Connected to Socket.IO server with ID: ${socket.id}`);
    joinCurrentRoom();
});

socket.on('connect_error', (err) => {
    console.error('[ChatRoom] Socket connection error:', err.message);
    messageContainer.innerHTML = `<div class="alert alert-danger">Không thể kết nối đến server chat. Vui lòng thử lại. Lỗi: ${err.message}</div>`;
});
*/

// Nếu `socket` đã là global từ `main.js`:
if (typeof socket === 'undefined' || !socket) {
    console.error('Socket instance not found. Ensure main.js initializes it.');
    messageContainer.innerHTML = `<div class="alert alert-danger">Lỗi khởi tạo kết nối chat.</div>`;
    // Dừng ở đây nếu không có socket
} else {
    console.log(`[ChatRoom] Using existing socket instance. ID: ${socket.id}. Room ID: ${currentRoomId}`);
    if (socket.connected) {
        joinCurrentRoom();
    } else {
        // Đợi socket kết nối nếu nó đang trong quá trình (hiếm khi cần nếu main.js xử lý tốt)
        socket.on('connect', joinCurrentRoom);
    }
}


function joinCurrentRoom() {
    if (currentRoomId && currentUser) {
        console.log(`[ChatRoom] Emitting 'joinRoom' for room ID: ${currentRoomId} by user: ${currentUser.username}`);
        socket.emit('joinRoom', { roomId: currentRoomId });
    } else {
        console.error('[ChatRoom] Room ID or User information is missing. Cannot join room.');
        messageContainer.innerHTML = '<div class="alert alert-warning">Thông tin phòng hoặc người dùng không hợp lệ.</div>';
    }
}

// --- Lắng nghe sự kiện từ Server ---

// 1. Nhận danh sách tin nhắn cũ khi mới vào phòng
socket.on('loadMessages', (messages) => {
    console.log('[ChatRoom] Received old messages:', messages);
    messageContainer.innerHTML = ''; // Xóa thông báo "Đang tải..." hoặc tin nhắn cũ (nếu có)
    if (messages && messages.length > 0) {
        messages.forEach(msg => displayMessage(msg));
    } else {
        messageContainer.innerHTML = '<p class="text-center text-muted">Chưa có tin nhắn nào trong phòng này.</p>';
    }
    scrollToBottom();
});

// 2. Nhận tin nhắn mới
socket.on('newMessage', (message) => {
    console.log('[ChatRoom] Received new message:', message);
    // Xóa thông báo "Chưa có tin nhắn" nếu có
    const noMessageP = messageContainer.querySelector('p.text-center.text-muted');
    if (noMessageP) noMessageP.remove();

    displayMessage(message);
    scrollToBottom();
    // Có thể thêm hiệu ứng âm thanh hoặc thông báo trình duyệt ở đây
});

// 3. Nhận thông báo có người mới tham gia
socket.on('userJoined', (data) => {
    console.log('[ChatRoom] User joined:', data);
    displayNotification(`${data.username} đã tham gia vào phòng.`);
});

// 4. Nhận thông báo có người rời phòng
socket.on('userLeft', (data) => {
    console.log('[ChatRoom] User left:', data);
    displayNotification(`${data.username} đã rời khỏi phòng.`);
});

// 5. (Tùy chọn) Cập nhật danh sách thành viên
socket.on('roomMembersUpdate', (members) => {
    console.log('[ChatRoom] Room members updated:', members);
    // Cập nhật UI hiển thị danh sách thành viên (nếu có)
    // Ví dụ:
    // const memberList = document.getElementById('memberList');
    // const memberCount = document.getElementById('memberCount');
    // if(memberList && memberCount) {
    //     memberList.innerHTML = '';
    //     members.forEach(member => {
    //         const li = document.createElement('li');
    //         li.textContent = member.username;
    //         memberList.appendChild(li);
    //     });
    //     memberCount.textContent = members.length;
    // }
});

// 6. Lắng nghe sự kiện join thành công (nếu server gửi)
socket.on('joinSuccess', (data) => {
    console.log(`[ChatRoom] Successfully joined room: ${data.roomName} (ID: ${data.roomId})`);
    if(document.getElementById('roomNameHeader')) {
        document.getElementById('roomNameHeader').innerHTML = `<i class="fas fa-comment-dots"></i> Phòng: ${data.roomName}`;
    }
    // Xóa thông báo "Đang tải..." ban đầu
    const loadingMsg = messageContainer.querySelector('.text-center.text-muted');
    if (loadingMsg && loadingMsg.textContent.includes('Đang tải')) {
        messageContainer.innerHTML = '';
    }
});

// 7. Lắng nghe lỗi từ server
socket.on('error', (errorData) => {
    console.error('[ChatRoom] Server error:', errorData.message);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger my-2';
    errorDiv.textContent = `Lỗi từ server: ${errorData.message}`;
    messageContainer.appendChild(errorDiv);
});

// 8. Cảnh báo spam
socket.on('spamWarning', (data) => {
    console.warn('[ChatRoom] Spam warning:', data.message);
    const warningDiv = document.createElement('div');
    warningDiv.className = 'alert alert-warning my-2 text-center';
    warningDiv.textContent = data.message;
    // Hiển thị ở một nơi dễ thấy, hoặc tạm thời chèn vào messageContainer
    const firstChild = messageContainer.firstChild;
    messageContainer.insertBefore(warningDiv, firstChild);
    setTimeout(() => warningDiv.remove(), 5000); // Xóa sau 5 giây
});


// --- Gửi tin nhắn ---
if (sendMessageBtn && messageInput) {
    sendMessageBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Gửi khi nhấn Enter (không phải Shift+Enter)
            e.preventDefault(); // Ngăn xuống dòng trong input
            sendMessage();
        }
    });
}

function sendMessage() {
    const text = messageInput.value.trim();
    if (text && currentRoomId) {
        console.log(`[ChatRoom] Sending message to room ${currentRoomId}: "${text}"`);
        socket.emit('sendMessage', {
            roomId: currentRoomId,
            text: text
        });
        messageInput.value = ''; // Xóa input sau khi gửi
        messageInput.focus();
    }
}

// --- Hàm tiện ích ---
function displayMessage(msg) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message-item', 'mb-2', 'p-2', 'rounded');

    // Phân biệt tin nhắn của mình và của người khác
    const isMyMessage = currentUser && msg.user && msg.user.id === currentUser.id;

    if (isMyMessage) {
        msgDiv.classList.add('my-message', 'bg-primary', 'text-white', 'ms-auto'); // Đẩy sang phải, màu khác
        msgDiv.style.maxWidth = '70%';
        msgDiv.style.textAlign = 'right';
    } else {
        msgDiv.classList.add('other-message', 'bg-light', 'text-dark', 'me-auto'); // Đẩy sang trái
        msgDiv.style.maxWidth = '70%';
    }

    const sender = msg.user ? msg.user.username : 'Người dùng ẩn';
    const avatarSrc = msg.user && msg.user.avatar ? (msg.user.avatar.startsWith('http') ? msg.user.avatar : '/' + msg.user.avatar) : '/images/default-avatar.png'; // Thay bằng avatar mặc định của bạn

    // Thời gian tin nhắn
    const timestamp = new Date(msg.timestamp || msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    let messageHTML = '';
    if (!isMyMessage) {
        messageHTML += `
            <div class="d-flex align-items-start">
                <img src="${avatarSrc}" alt="${sender}" class="rounded-circle me-2" width="30" height="30">
                <div>
                    <small class="fw-bold d-block">${sender}</small>
        `;
    } else {
         messageHTML += `<div>`; // Để giữ cấu trúc cho tin nhắn của mình
    }

    messageHTML += `<div class="message-text">${escapeHTML(msg.text)}</div>`; // Chống XSS cơ bản

    if (!isMyMessage) {
        messageHTML += `
                    <small class="text-muted timestamp">${timestamp}</small>
                </div>
            </div>
        `;
    } else {
        messageHTML += `<small class="text-muted timestamp d-block mt-1">${timestamp}</small></div>`;
    }


    msgDiv.innerHTML = messageHTML;
    messageContainer.appendChild(msgDiv);
}

function displayNotification(notificationText) {
    const notifDiv = document.createElement('div');
    notifDiv.classList.add('text-center', 'text-muted', 'my-2', 'fst-italic');
    notifDiv.textContent = notificationText;
    messageContainer.appendChild(notifDiv);
    scrollToBottom();
}

function scrollToBottom() {
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

function escapeHTML(str) {
    var p = document.createElement('p');
    p.appendChild(document.createTextNode(str));
    return p.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}


// --- CSS bổ sung (bạn có thể thêm vào file style.css) ---
/*
.my-message {
    align-self: flex-end; // Hoặc dùng ms-auto của bootstrap
}
.other-message {
    align-self: flex-start; // Hoặc dùng me-auto của bootstrap
}
.message-text {
    white-space: pre-wrap; // Giữ nguyên các dấu xuống dòng trong tin nhắn
}
.timestamp {
    font-size: 0.75em;
}
*/

// Gọi hàm khi trang đã tải xong các element
document.addEventListener('DOMContentLoaded', () => {
    // Có thể không cần nếu `socket` được đảm bảo khởi tạo từ main.js và các biến global đã sẵn sàng
    // Nếu socket không có, các hàm bên trong if(socket) sẽ không chạy
});