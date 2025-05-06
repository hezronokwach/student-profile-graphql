import { GraphQLClient } from 'graphql-request';
import { jwtDecode } from 'jwt-decode';

document.addEventListener('DOMContentLoaded', async () => {
  const errorMessage = document.getElementById('error-message');
  const userIdSpan = document.getElementById('user-id');
  const userLoginSpan = document.getElementById('user-login');
  const totalXpSpan = document.getElementById('total-xp');
  const gradesList = document.getElementById('grades-list');
  const logoutButton = document.getElementById('logout-button');

  // Check for JWT
  const jwt = localStorage.getItem('jwt');
  if (!jwt) {
    window.location.href = '../pages/login.html';
    return;
  }

  // Decode JWT to get user ID
  let userId;
  try {
    const decoded = jwtDecode(jwt);
    userId = decoded.sub || decoded.id; // Adjust based on JWT structure
    console.log('Decoded JWT:', decoded); // Log JWT payload
  } catch (error) {
    errorMessage.textContent = 'Invalid JWT';
    console.error('JWT decode error:', error);
    return;
  }

  // Initialize GraphQL client
  const client = new GraphQLClient('https://learn.zone01kisumu.ke/api/graphql-engine/v1/graphql', {
    headers: {
      Authorization: `Bearer ${jwt}`
    }
  });

  try {
    // Normal query: Fetch user info
    const userQuery = `
      {
        user {
          id
          login
        }
      }
    `;
    const userData = await client.request(userQuery);
    console.log('User Data:', userData); // Log raw user data
    if (userData.user && userData.user.length > 0) {
      userIdSpan.textContent = userData.user[0].id;
      userLoginSpan.textContent = userData.user[0].login;
    } else {
      errorMessage.textContent = 'No user data found';
    }

    // Query with arguments: Fetch XP transactions
    const xpQuery = `
      {
        transaction(where: { type: { _eq: "xp" } }) {
          amount
          createdAt
        }
      }
    `;
    const xpData = await client.request(xpQuery);
    console.log('XP Data:', xpData); // Log raw XP data
    const totalXp = xpData.transaction ? xpData.transaction.reduce((sum, tx) => sum + tx.amount, 0) : 0;
    console.log('Total XP:', totalXp); // Log calculated total XP
    totalXpSpan.textContent = `${totalXp} XP`;

    // Nested query: Fetch recent grades (use limit instead of first)
    const gradesQuery = `
      {
        progress(limit: 5) {
          grade
          createdAt
          object {
            name
          }
        }
      }
    `;
    const gradesData = await client.request(gradesQuery);
    console.log('Grades Data:', gradesData); // Log raw grades data
    gradesList.innerHTML = '';
    if (gradesData.progress && gradesData.progress.length > 0) {
      gradesData.progress.forEach(progress => {
        const li = document.createElement('li');
        li.textContent = `${progress.object.name}: ${progress.grade === 1 ? 'Pass' : 'Fail'} (Date: ${new Date(progress.createdAt).toLocaleDateString()})`;
        gradesList.appendChild(li);
      });
    } else {
      gradesList.innerHTML = '<li>No grades available</li>';
    }
  } catch (error) {
    errorMessage.textContent = 'Error fetching profile data. Please try again.';
    console.error('GraphQL error:', error);
  }

  // Handle logout
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('jwt');
    window.location.href = '../pages/login.html';
  });
});