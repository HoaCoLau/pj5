document.getElementById('loginForm').onsubmit = async e => {
  e.preventDefault();
  const username = e.target.username.value;
  const password = e.target.password.value;
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('token', data.token);
    window.location = '/chat';
  } else {
    document.getElementById('authMsg').innerText = data.message;
  }
};

document.getElementById('registerForm').onsubmit = async e => {
  e.preventDefault();
  const username = e.target.username.value;
  const password = e.target.password.value;
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.message === 'Đăng ký thành công') {
    document.getElementById('authMsg').innerText = 'Đăng ký thành công, hãy đăng nhập!';
  } else {
    document.getElementById('authMsg').innerText = data.message;
  }
};