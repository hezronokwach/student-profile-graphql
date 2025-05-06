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
    } catch (error) {
      errorMessage.textContent = 'Invalid JWT';
      console.error('JWT decode error:', error);
      return;
    }
  
    // Initialize GraphQL client
    const client = new GraphQLRequest.GraphQLClient('https://learn.zone01kisumu.ke/api/graphql-engine/v1/graphql', {
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
      userIdSpan.textContent = userData.user[0].id;
      userLoginSpan.textContent = userData.user[0].login;
  
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
      const totalXp = xpData.transaction.reduce((sum, tx) => sum + tx.amount, 0);
      totalXpSpan.textContent = `${totalXp} XP`;
  
      // Nested query: Fetch recent grades
      const gradesQuery = `
        {
          progress(first: 5) {
            grade
            createdAt
            object {
              name
            }
          }
        }
      `;
      const gradesData = await client.request(gradesQuery);
      gradesList.innerHTML = '';
      gradesData.progress.forEach(progress => {
        const li = document.createElement('li');
        li.textContent = `${progress.object.name}: ${progress.grade === 1 ? 'Pass' : 'Fail'} (Date: ${new Date(progress.createdAt).toLocaleDateString()})`;
        gradesList.appendChild(li);
      });
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