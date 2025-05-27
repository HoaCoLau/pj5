// public/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const logoutLink = document.getElementById('logoutLink');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(registerForm);
            const data = Object.fromEntries(formData.entries());

            // Xóa các thông báo lỗi cũ
            clearErrors();

            try {
                const response = await fetch('/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json' // Để server biết client muốn JSON
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (!response.ok) {
                    // Xử lý lỗi từ server (validation errors, etc.)
                    if (result.errors && Array.isArray(result.errors)) {
                        displayErrors(result.errors, registerForm);
                    } else {
                        displayErrors([{ field: 'general', message: result.message || 'Lỗi không xác định.' }], registerForm);
                    }
                    throw new Error(result.message || 'Đăng ký thất bại');
                }

                // Đăng ký thành công
                alert(result.message || 'Đăng ký thành công! Vui lòng đăng nhập.');
                window.location.href = '/auth/login'; // Chuyển đến trang đăng nhập

            } catch (error) {
                console.error('Lỗi đăng ký:', error);
                // alert('Đã có lỗi xảy ra trong quá trình đăng ký.');
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());

            clearErrors();

            try {
                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (!response.ok) {
                    if (result.errors && Array.isArray(result.errors)) {
                        displayErrors(result.errors, loginForm);
                    } else {
                         displayErrors([{ field: 'general', message: result.message || 'Lỗi không xác định.' }], loginForm);
                    }
                    throw new Error(result.message || 'Đăng nhập thất bại');
                }

                // Đăng nhập thành công
                localStorage.setItem('chatToken', result.token); // Lưu token vào localStorage
                localStorage.setItem('chatUser', JSON.stringify(result.user)); // Lưu thông tin user

                alert(result.message || 'Đăng nhập thành công!');
                // Kết nối lại Socket.IO với token mới (nếu socket đã được khởi tạo)
                // Hoặc đơn giản là reload trang/chuyển hướng, socket sẽ tự kết nối lại với token từ localStorage
                window.location.href = '/'; // Chuyển về trang chủ hoặc trang chat

            } catch (error) {
                console.error('Lỗi đăng nhập:', error);
                // alert('Đã có lỗi xảy ra trong quá trình đăng nhập.');
            }
        });
    }

    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                // Gọi API logout của server để server xóa HTTPOnly cookie
                const response = await fetch('/auth/logout', {
                    method: 'GET', // Hoặc POST, tùy bạn định nghĩa route
                    headers: {
                        // Nếu API logout của bạn cần xác thực (token trong header), thì thêm vào
                        // 'Authorization': `Bearer ${localStorage.getItem('chatToken')}`
                        // Nhưng thường logout không cần, vì nó dựa vào session/cookie đang có
                    }
                });

                if (!response.ok) {
                    // Xử lý nếu server logout không thành công (hiếm khi)
                    console.error('Server logout failed:', await response.text());
                }
                // const result = await response.json(); // Nếu server trả JSON
                // console.log(result.message);

            } catch (error) {
                console.error('Lỗi khi gọi API logout:', error);
                // Vẫn tiếp tục xử lý logout ở client dù API có lỗi
            } finally {
                // Quan trọng nhất: Xóa token khỏi localStorage của client
                localStorage.removeItem('chatToken');
                localStorage.removeItem('chatUser'); // Xóa cả thông tin user đã lưu
                alert('Bạn đã đăng xuất.');
                window.location.href = '/auth/login'; // Chuyển về trang đăng nhập
            }
        });
    }

    function displayErrors(errors, formElement) {
        // Xóa lỗi cũ trong form cụ thể
        const oldErrorMessages = formElement.querySelectorAll('.server-error-message');
        oldErrorMessages.forEach(el => el.remove());

        let generalErrorContainer = formElement.querySelector('.general-errors');
        if (!generalErrorContainer) {
            generalErrorContainer = document.createElement('div');
            generalErrorContainer.className = 'alert alert-danger server-error-message general-errors';
            generalErrorContainer.setAttribute('role', 'alert');
            const ul = document.createElement('ul');
            ul.className = 'mb-0';
            generalErrorContainer.appendChild(ul);
            // Chèn vào đầu form hoặc vị trí thích hợp
            formElement.insertBefore(generalErrorContainer, formElement.firstChild);
        }
        const ulElement = generalErrorContainer.querySelector('ul');

        errors.forEach(error => {
            const fieldInput = formElement.querySelector(`[name="${error.field}"]`);
            if (fieldInput) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'text-danger server-error-message'; // Thêm class để dễ dàng xóa
                errorDiv.style.fontSize = '0.875em';
                errorDiv.textContent = error.message;
                // Chèn lỗi ngay sau input field
                fieldInput.classList.add('is-invalid'); // Bootstrap class
                if (fieldInput.parentNode) {
                     // Đảm bảo không chèn nhiều lần
                    if(!fieldInput.parentNode.querySelector(`.error-for-${error.field}`)){
                        errorDiv.classList.add(`error-for-${error.field}`);
                        fieldInput.parentNode.insertBefore(errorDiv, fieldInput.nextSibling);
                    }
                }
            } else { // Lỗi chung không gắn với field cụ thể
                const li = document.createElement('li');
                li.textContent = error.message;
                ulElement.appendChild(li);
            }
        });
         if(ulElement.children.length === 0){
            generalErrorContainer.style.display = 'none';
        } else {
            generalErrorContainer.style.display = 'block';
        }
    }

    function clearErrors() {
        const errorMessages = document.querySelectorAll('.server-error-message');
        errorMessages.forEach(el => el.remove());
        const invalidFields = document.querySelectorAll('.is-invalid');
        invalidFields.forEach(el => el.classList.remove('is-invalid'));
    }

}); 