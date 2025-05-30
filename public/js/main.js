// public/js/main.js
console.log("main.js loaded");

// Lấy token từ localStorage (sau này khi login thành công sẽ lưu token vào đây)
const token = localStorage.getItem('chatToken'); // Giữ nguyên - Khai báo token một lần

const socket = io({ // Kết nối tới server Socket.IO
    auth: { // Gửi token qua 'auth' object
        token: token
    }
});

socket.on('connect', () => {
    console.log(`[Main] Connected to Socket.IO server! Socket ID: ${socket.id}`);
});

socket.on('connect_error', (err) => {
    console.error('[Main] Global Socket connection error:', err.message);
    if (err.message.includes('Token not provided') || err.message.includes('Invalid token') || err.message.includes('Token expired')) {
        console.warn('[Main] Token authentication failed. Clearing token and redirecting to login.');
        localStorage.removeItem('chatToken');
        localStorage.removeItem('chatUser');
        if (!window.location.pathname.startsWith('/auth')) {
            alert("Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.");
        }
    }
});

socket.on('disconnect', (reason) => {
    // Log này đã có dạng tiếng Việt ở dưới, có thể bỏ dòng này nếu muốn thống nhất
    // console.log('Đã ngắt kết nối khỏi server Socket.IO:', reason);
    console.log(`[Main] Disconnected from Socket.IO server. Reason: ${reason}`);
});


// --- Phần test chat cơ bản (LOGIC NÀY CẦN XEM XÉT KỸ NẾU MAIN.JS CHẠY TRÊN TRANG ROOM_DETAIL) ---
// Nếu các ID ('joinRoomBtn', 'roomNameInput', 'messageInput', 'sendMessageBtn', 'messagesDiv')
// cũng tồn tại trên trang room_detail.ejs và được chatRoom.js quản lý,
// thì các dòng khai báo const ở đây sẽ gây lỗi "already declared".
// Để an toàn, nếu main.js được tải trên mọi trang, logic DOM này nên được gói trong điều kiện
// kiểm tra xem các element này có thực sự thuộc về ngữ cảnh của main.js hay không.

/* // Bắt đầu comment out các phần có thể gây xung đột hoặc không cần thiết trên trang room_detail
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomNameInput = document.getElementById('roomNameInput');
// const messageInput = document.getElementById('messageInput'); // Gây xung đột với chatRoom.js
// const sendMessageBtn = document.getElementById('sendMessageBtn'); // Gây xung đột với chatRoom.js
const messagesDiv = document.getElementById('messages'); // Nếu ID này cũng dùng ở room_detail thì sẽ xung đột

// let currentRoomId = null; // ĐÃ GÂY XUNG ĐỘT với script inline của room_detail.ejs - BẮT BUỘC XÓA/COMMENT

if (joinRoomBtn && roomNameInput) { // Thêm kiểm tra sự tồn tại của element
    joinRoomBtn.addEventListener('click', () => {
        const roomIdToJoin = roomNameInput.value.trim();
        if (roomIdToJoin) {
            console.log(`[Main.js Test Chat] Attempting to join room: ${roomIdToJoin}`);
            socket.emit('joinRoom', { roomId: roomIdToJoin });
        }
    });
}

// if (sendMessageBtn && messageInput) { // messageInput đã bị comment
if (document.getElementById('sendMessageBtn') && document.getElementById('messageInput')) { // Kiểm tra lại, có thể ID khác
    const mainJsSendMessageBtn = document.getElementById('sendMessageBtn'); // Tạo biến local nếu cần
    const mainJsMessageInput = document.getElementById('messageInput');

    mainJsSendMessageBtn.addEventListener('click', () => {
        const messageText = mainJsMessageInput.value.trim();
        // Giả sử currentRoomId của main.js được quản lý riêng (hiện tại đã comment)
        // if (messageText && mainJsCurrentRoomId) { // Cần biến currentRoomId riêng cho phần test này
        //     socket.emit('sendMessage', { roomId: mainJsCurrentRoomId, text: messageText });
        //     mainJsMessageInput.value = '';
        // } else if (!mainJsCurrentRoomId) {
        //     console.warn("[Main.js Test Chat] Chưa tham gia phòng nào để gửi tin nhắn.");
        // }
        console.log("[Main.js Test Chat] Send button clicked. Logic cần currentRoomId riêng.");
    });
}
*/ // Kết thúc comment out khối test

// Các trình xử lý sự kiện socket.on ở đây có thể là global hoặc dành cho phần test.
// Nếu chúng dành riêng cho trang phòng chat, chúng nên được đặt trong chatRoom.js.
// Nếu main.js được tải trên trang phòng chat, các handler này có thể chạy song song với handler trong chatRoom.js.

/* // Comment out các handler này trong main.js nếu chúng được xử lý tốt hơn bởi chatRoom.js
socket.on('joinSuccess', (data) => {
    // Logic này có vẻ dành cho một giao diện test cụ thể, không phải phòng chat chính
    console.log(`[Main.js] Received 'joinSuccess' for room: ${data.roomName}. This might conflict if on chat_room page.`);
    // Ví dụ: if (messagesDiv && roomNameInput && document.getElementById('chatArea')) { ... }
});

socket.on('newMessage', (message) => {
    console.log('[Main.js] Received new message:', message, " - This might conflict if on chat_room page.");
});

socket.on('userJoined', (data) => {
    console.log('[Main.js] User joined:', data, " - This might conflict if on chat_room page.");
});

socket.on('userLeft', (data) => {
    console.log('[Main.js] User left:', data, " - This might conflict if on chat_room page.");
});

socket.on('loadMessages', (messages) => {
    console.log('[Main.js] Loading old messages:', messages, " - This might conflict if on chat_room page.");
});
*/ // Kết thúc comment out các socket handlers

// Các handler này có vẻ là chung, có thể giữ lại
socket.on('error', (errorData) => { // Lỗi từ server gửi qua socket event 'error'
    console.error('[Main] Server error via socket:', errorData.message);
    // alert(`Lỗi từ server: ${errorData.message}`); // Có thể bị alert 2 lần nếu chatRoom.js cũng có
});

socket.on('spamWarning', (data) => {
    console.warn('[Main] Spam warning via socket:', data.message);
    // alert(data.message); // Có thể bị alert 2 lần nếu chatRoom.js cũng có
});