// File: public/js/chat.js

document.addEventListener('DOMContentLoaded', () => {
    // Lấy các element trên trang
    const imageUploadBtn = document.getElementById('image-upload-btn');
    const imageInput = document.getElementById('image-input');
    const messageList = document.getElementById('message-list');
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPicker = document.querySelector('emoji-picker');
    emojiBtn.addEventListener('click', () => {
        emojiPicker.classList.toggle('visible');
    });
     const inviteModal = document.getElementById('invite-modal');
    const openInviteBtn = document.getElementById('open-invite-modal-btn');
    const closeBtn = document.querySelector('.modal .close-btn'); // Lấy nút close bên trong modal
    if (openInviteBtn && inviteModal && closeBtn) {
        openInviteBtn.addEventListener('click', () => {
            inviteModal.style.display = 'block';
        });

        closeBtn.addEventListener('click', () => {
            inviteModal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target == inviteModal) {
                inviteModal.style.display = 'none';
            }
        });
    }
    // Khi một emoji được chọn
    emojiPicker.addEventListener('emoji-click', event => {
        messageInput.value += event.detail.unicode; // Chèn emoji vào ô input
        emojiPicker.classList.remove('visible'); // Ẩn bảng chọn đi
    });
    // Kiểm tra xem các biến chatRoomId và jwtToken có tồn tại không
    if (typeof chatRoomId === 'undefined' || typeof jwtToken === 'undefined' || !jwtToken) {
        alert("Lỗi: Không tìm thấy thông tin phòng hoặc token. Vui lòng đăng nhập lại.");
        window.location.href = '/auth/login';
        return;
    }

    // 1. Kết nối tới server Socket.IO và gửi token để xác thực
    const socket = io({
        auth: { token: jwtToken }
    });

    // 2. Xử lý khi kết nối thành công
    socket.on('connect', () => {
        console.log('✅ Đã kết nối tới server socket!', socket.id);
        // Gửi sự kiện tham gia phòng
        socket.emit('joinRoom', { roomId: chatRoomId });
    });

    // Xử lý khi có lỗi kết nối (ví dụ token hết hạn)
    socket.on('connect_error', (err) => {
        console.error('Lỗi kết nối:', err.message);
        alert(`Lỗi xác thực: ${err.message}`);
        window.location.href = '/auth/login';
    });

    // 3. Lắng nghe lịch sử tin nhắn từ server
    socket.on('loadHistory', (messages) => {
        messageList.innerHTML = ''; // Xóa tin nhắn cũ
        messages.forEach(msg => displayMessage(msg));
    });

    // 4. Lắng nghe tin nhắn mới (hoặc thông báo hệ thống)
    socket.on('message', (message) => {
        displayMessage(message);
    });

    // 5. Lắng nghe cảnh báo spam
    socket.on('spamWarning', (warning) => {
        alert(warning);
    });

    // 6. Xử lý khi người dùng gửi form chat
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const content = messageInput.value.trim();
        if (content) {
            // Gửi sự kiện chatMessage lên server
            socket.emit('chatMessage', { roomId: chatRoomId, content });
            messageInput.value = '';
            messageInput.focus();
        }
    });

    imageUploadBtn.addEventListener('click', () => {
        imageInput.click();
    });

    // Khi người dùng chọn một file ảnh
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('chatImage', file);

        // Gửi ảnh lên server bằng fetch
        fetch(`/chats/${chatRoomId}/image`, {
            method: 'POST',
            body: formData,
            headers: {
                // Thêm token để xác thực
                'Authorization': `Bearer ${jwtToken}`
            }
        })
            .then(res => res.json())
            .then(data => {
                if (!data.success) {
                    alert(data.error || 'Gửi ảnh thất bại.');
                }
                // Tin nhắn sẽ được server gửi lại qua socket, không cần làm gì thêm
            })
            .catch(err => console.error(err));

        e.target.value = ''; // Reset input để có thể chọn lại cùng 1 file
    });
    // Hàm trợ giúp để hiển thị tin nhắn lên giao diện
    function displayMessage(msg) {
        const item = document.createElement('div');
        item.classList.add('message-item');

        // Tin nhắn hệ thống (tham gia/rời/mời)
        if (msg.message_type === 'system') {
            item.classList.add('system-message');
            item.textContent = msg.content;
        }
        // Tin nhắn của người dùng (văn bản hoặc hình ảnh)
        else {
            const sender = msg.Sender;
            const timestamp = new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

            // Tạo nội dung tin nhắn dựa trên message_type
            let messageContentHTML = '';
            if (msg.message_type === 'image') {
                // Nếu là ảnh, msg.content chính là đường dẫn ảnh
                messageContentHTML = `<img src="${msg.content}" alt="Ảnh gửi trong chat" class="chat-image">`;
            } else {
                // Mặc định là text
                messageContentHTML = msg.content;
            }

            item.innerHTML = `
            <div class="message-avatar">
                <img src="${sender?.avatar_url || 'https://via.placeholder.com/40'}" width="25px" alt="avt">
            </div>
            <div class="message-body">
                <div class="message-sender">
                    <strong>${sender?.username || 'Vô danh'}</strong>
                    <span class="message-time">${timestamp}</span>
                </div>
                <div class="message-content">${messageContentHTML}</div>
            </div>
        `;
        }

        messageList.appendChild(item);
        // Tự động cuộn xuống tin nhắn mới nhất
        messageList.scrollTop = messageList.scrollHeight;
    }
});