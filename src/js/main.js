console.log('School Profile app initialized!');

document.addEventListener('DOMContentLoaded', () => {
  const loginLink = document.getElementById('login-link');
  const profileLink = document.getElementById('profile-link');
  const logoutButton = document.getElementById('logout-button');

  // Check if user is logged in
  const jwt = localStorage.getItem('jwt');
  if (jwt) {
    loginLink.style.display = 'none';
    profileLink.style.display = 'inline-block';
    logoutButton.style.display = 'inline-block';
  } else {
    loginLink.style.display = 'inline-block';
    profileLink.style.display = 'none';
    logoutButton.style.display = 'none';
  }

  // Handle logout
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('jwt');
    window.location.href = 'pages/login.html';
  });
});