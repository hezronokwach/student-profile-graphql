import axios from 'axios';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const errorMessage = document.getElementById('error-message');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessage.textContent = '';

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
      errorMessage.textContent = 'Please enter both username/email and password';
      return;
    }

    try {
      const credentials = `${username}:${password}`;
      const base64Credentials = btoa(credentials);
      const response = await axios.post(
        'https://learn.zone01kisumu.ke/api/auth/signin',
        {},
        {
          headers: {
            'Authorization': `Basic ${base64Credentials}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const jwt = response.data; // Adjust based on actual response structure
      localStorage.setItem('jwt', jwt);
      window.location.href = '../index.html';
    } catch (error) {
      errorMessage.textContent = 'Invalid credentials, please try again';
      console.error('Login error:', error);
    }
  });
});