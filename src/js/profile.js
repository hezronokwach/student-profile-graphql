async function fetchUserData() {
  try {
    const jwt = localStorage.getItem('jwt');
    if (!jwt) {
      window.location.href = 'login.html';
      return;
    }

    const query = `
      {
        user {
          id
          login
          transactions(order_by: {createdAt: asc}) {
            id
            type
            amount
            createdAt
            path
          }
          progresses(order_by: {createdAt: desc}) {
            id
            grade
            createdAt
            object {
              id
              name
              type
            }
            path
          }
          results {
            id
            grade
            createdAt
            object {
              id
              name
              type
            }
          }
        }
      }
    `;

    const response = await fetch('https://learn.zone01kisumu.ke/api/graphql-engine/v1/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    console.log(data); // Debug response

    if (!data.data || !data.data.user) {
      throw new Error('Invalid response data structure');
    }

    return data.data;
  } catch (error) {
    document.getElementById('error-message').textContent = 'Failed to load data: ' + error.message;
    console.error('Error fetching data:', error);
    return null;
  }
}

function populateUserInfo(data) {
  if (!data || !data.user || !data.user[0]) {
    document.getElementById('error-message').textContent = 'No user data available';
    return;
  }

  const user = data.user[0];
  
  // Basic Info
  document.getElementById('user-id').textContent = user.id;
  document.getElementById('user-login').textContent = user.login;
  
  // XP Calculation
  const totalXp = user.transactions
    .filter(t => t.type === 'xp')
    .reduce((sum, t) => sum + t.amount, 0);
  document.getElementById('total-xp').textContent = Math.round(totalXp).toLocaleString();

  // Progress Display
  const progressList = document.getElementById('grades-list');
  progressList.innerHTML = ''; // Clear existing content
  
  user.progresses.slice(0, 10).forEach(prog => { // Show last 10 entries
    const li = document.createElement('li');
    li.className = 'mb-2 p-2 border-b';
    li.innerHTML = `
      <span class="font-medium">${prog.object.name}</span>
      <span class="float-right ${prog.grade ? 'text-green-500' : 'text-red-500'}">
        ${prog.grade ? 'Pass' : 'Fail'}
      </span>
      <br>
      <small class="text-gray-500">${new Date(prog.createdAt).toLocaleDateString()}</small>
    `;
    progressList.appendChild(li);
  });

  populateRecentResults(user); // Add this line
}

// Add this function to populate recent results
function populateRecentResults(user) {
  const resultsList = document.getElementById('results-list');
  resultsList.innerHTML = '';
  
  user.results.slice(0, 10).forEach(result => {
    const li = document.createElement('li');
    li.className = 'mb-2 p-2 border-b';
    li.innerHTML = `
      <span class="font-medium">${result.object?.name || 'Unnamed'}</span>
      <span class="float-right ${result.grade ? 'text-green-500' : 'text-red-500'}">
        ${result.grade ? 'Pass' : 'Fail'}
      </span>
      <br>
      <small class="text-gray-500">${new Date(result.createdAt).toLocaleDateString()}</small>
    `;
    resultsList.appendChild(li);
  });
}

function renderLineChart(data) {
  if (!data.user[0].transactions.length) return;

  const margin = {top: 20, right: 20, bottom: 30, left: 50};
  const width = 600 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // Clear existing chart
  d3.select('#xp-line-chart').html('');

  const svg = d3.select('#xp-line-chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Prepare XP data
  const xpData = data.user[0].transactions
    .filter(t => t.type === 'xp')
    .map(t => ({
      date: new Date(t.createdAt),
      amount: t.amount
    }))
    .sort((a, b) => a.date - b.date);

  // Calculate cumulative XP
  let cumulativeXP = 0;
  const cumulativeData = xpData.map(d => {
    cumulativeXP += d.amount;
    return {
      date: d.date,
      xp: cumulativeXP
    };
  });

  // Scales
  const x = d3.scaleTime()
    .domain(d3.extent(cumulativeData, d => d.date))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(cumulativeData, d => d.xp)])
    .range([height, 0]);

  // Line generator
  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.xp));

  // Add the line path
  svg.append('path')
    .datum(cumulativeData)
    .attr('class', 'line')
    .attr('fill', 'none')
    .attr('stroke', '#3498db')
    .attr('stroke-width', 2)
    .attr('d', line);

  // Add axes
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg.append('g')
    .call(d3.axisLeft(y));
}

// Add this function to create pass/fail ratio pie chart
function renderPieChart(data) {
  const user = data.user[0];
  const results = user.results;
  
  const passed = results.filter(r => r.grade > 0).length;
  const failed = results.filter(r => r.grade === 0).length;
  
  const width = 400;
  const height = 400;
  const radius = Math.min(width, height) / 2;
  
  // Clear existing chart
  d3.select('#pass-fail-pie-chart').html('');
  
  const svg = d3.select('#pass-fail-pie-chart')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width/2},${height/2})`);
    
  const color = d3.scaleOrdinal()
    .domain(['Pass', 'Fail'])
    .range(['#34D399', '#EF4444']);
    
  const pie = d3.pie()
    .value(d => d.value);
    
  const data_ready = pie([
    {name: 'Pass', value: passed},
    {name: 'Fail', value: failed}
  ]);
  
  const arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);
    
  svg.selectAll('mySlices')
    .data(data_ready)
    .join('path')
    .attr('d', arcGenerator)
    .attr('fill', d => color(d.data.name))
    .attr('stroke', 'white')
    .style('stroke-width', '2px');
    
  // Add labels
  svg.selectAll('mySlices')
    .data(data_ready)
    .join('text')
    .text(d => `${d.data.name}: ${d.data.value}`)
    .attr('transform', d => `translate(${arcGenerator.centroid(d)})`)
    .style('text-anchor', 'middle')
    .style('font-size', 12);
}

async function init() {
  const data = await fetchUserData();
  if (data) {
    document.getElementById('loading-spinner').style.display = 'none';
    populateUserInfo(data);
    renderLineChart(data);
    renderPieChart(data); // Add this line
  }
}

init();