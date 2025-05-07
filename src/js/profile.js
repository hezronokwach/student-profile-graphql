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
          attrs
          totalUp
          totalDown
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
  
  // Calculate overall grade and XP
  const totalXp = user.transactions
    .filter(t => t.type === 'xp')
    .reduce((sum, t) => sum + t.amount, 0);

  const overallGrade = user.results.length > 0 
    ? (user.results.filter(r => r.grade > 0).length / user.results.length * 100).toFixed(1)
    : 0;

  // Update user info card with all information
  const userInfoHtml = `
    <h2 class="text-2xl font-semibold text-blue-600 mb-4">User Information</h2>
    <div class="space-y-2">
      <p class="text-gray-700"><strong>ID:</strong> ${user.id}</p>
      <p class="text-gray-700"><strong>Login:</strong> ${user.login}</p>
      <p class="text-gray-700"><strong>Total XP:</strong> ${Math.round(totalXp).toLocaleString()}</p>
      <p class="text-gray-700"><strong>Overall Grade:</strong> ${overallGrade}%</p>
      <p class="text-gray-700"><strong>Total Up Votes:</strong> ${user.totalUp || 0}</p>
      <p class="text-gray-700"><strong>Total Down Votes:</strong> ${user.totalDown || 0}</p>
    </div>
  `;

  document.querySelector('.card.delay-1').innerHTML = userInfoHtml;

  // Update progress display - limit to 5 entries
  const progressList = document.getElementById('grades-list');
  progressList.innerHTML = '';
  
  user.progresses.slice(0, 5).forEach(prog => {
    const li = document.createElement('li');
    li.className = 'mb-2 p-2 border-b';
    li.innerHTML = `
      <span class="font-medium">${prog.object.name || 'Unnamed'}</span>
      <span class="float-right ${prog.grade ? 'text-green-500' : 'text-red-500'}">
        ${prog.grade ? 'Pass' : 'Fail'}
      </span>
      <br>
      <small class="text-gray-500">${new Date(prog.createdAt).toLocaleDateString()}</small>
    `;
    progressList.appendChild(li);
  });

  // Update recent results - limit to 5 entries
  const resultsList = document.getElementById('results-list');
  resultsList.innerHTML = '';
  
  user.results.slice(0, 5).forEach(result => {
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

// Add these new functions
function renderAuditRatioCard(data) {
  const user = data.user[0];
  const auditsDone = user.transactions.filter(t => t.type === 'up' || t.type === 'down').length;
  const auditsReceived = user.totalUp + user.totalDown;
  
  const auditHtml = `
    <h2 class="text-2xl font-semibold text-blue-600 mb-4">Audit Statistics</h2>
    <div class="space-y-2">
      <p class="text-gray-700"><strong>Audits Done:</strong> ${auditsDone}</p>
      <p class="text-gray-700"><strong>Audits Received:</strong> ${auditsReceived}</p>
      <p class="text-gray-700"><strong>Positive Feedback:</strong> ${user.totalUp}</p>
      <p class="text-gray-700"><strong>Negative Feedback:</strong> ${user.totalDown}</p>
    </div>
  `;
  
  document.querySelector('.card.delay-5').innerHTML = auditHtml;
}

function renderPiscineStatsCard(data) {
  const user = data.user[0];
  const piscineProjects = user.progresses.filter(p => p.path.includes('piscine'));
  const passed = piscineProjects.filter(p => p.grade > 0).length;
  const failed = piscineProjects.filter(p => p.grade === 0).length;
  
  const piscineHtml = `
    <h2 class="text-2xl font-semibold text-blue-600 mb-4">Piscine Statistics</h2>
    <div class="space-y-2">
      <p class="text-gray-700"><strong>Total Attempts:</strong> ${piscineProjects.length}</p>
      <p class="text-gray-700"><strong>Passed:</strong> ${passed}</p>
      <p class="text-gray-700"><strong>Failed:</strong> ${failed}</p>
      <p class="text-gray-700"><strong>Success Rate:</strong> ${((passed/piscineProjects.length) * 100).toFixed(1)}%</p>
    </div>
  `;
  
  document.querySelector('.card.delay-6').innerHTML = piscineHtml;
}

// Update renderLineChart function
function renderLineChart(data) {
  if (!data.user[0].transactions.length) return;

  const margin = {top: 40, right: 60, bottom: 60, left: 100}; // Increased left margin
  const width = Math.min(1000, window.innerWidth - 100) - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom; // Reduced height

  d3.select('#xp-line-chart').html('');

  const svg = d3.select('#xp-line-chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Prepare data
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

  // Add X axis with time formatting
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x)
      .ticks(10)
      .tickFormat(d3.timeFormat('%b %d, %Y')))
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-45)");

  // Add Y axis
  svg.append('g')
    .call(d3.axisLeft(y)
      .tickFormat(d => `${Math.round(d).toLocaleString()} XP`));

  // Add line
  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.xp));

  svg.append('path')
    .datum(cumulativeData)
    .attr('class', 'line')
    .attr('fill', 'none')
    .attr('stroke', '#3498db')
    .attr('stroke-width', 2)
    .attr('d', line);

  // Remove axis labels
  // Removed svg.append("text") for x and y labels

  // Add tooltips
  const tooltip = d3.select('#xp-line-chart')
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0)
    .style('position', 'absolute')
    .style('background-color', 'rgba(0,0,0,0.7)')
    .style('color', 'white')
    .style('padding', '8px')
    .style('border-radius', '4px');

  // Add dots for data points
  svg.selectAll('.dot')
    .data(cumulativeData)
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('cx', d => x(d.date))
    .attr('cy', d => y(d.xp))
    .attr('r', 4)
    .attr('fill', '#3498db')
    .on('mouseover', function(event, d) {
      tooltip.transition()
        .duration(200)
        .style('opacity', .9);
      tooltip.html(`Date: ${d.date.toLocaleDateString()}<br/>XP: ${Math.round(d.xp).toLocaleString()}`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', function() {
      tooltip.transition()
        .duration(500)
        .style('opacity', 0);
    });
}

// Update renderPieChart function 
function renderPieChart(data) {
  console.log('Rendering pie chart with data:', data);
  
  const user = data.user[0];
  const results = user.results;
  
  const passed = results.filter(r => r.grade > 0).length;
  const failed = results.filter(r => r.grade === 0).length;

  // Changed selector to match HTML structure - using delay-6 for pie chart
  const pieChartCard = document.querySelector('.card.delay-6');
  if (!pieChartCard) {
    console.error('Pie chart container not found');
    return;
  }

  pieChartCard.innerHTML = `
    <h2 class="text-2xl font-semibold text-blue-600 mb-4">Pass/Fail Ratio</h2>
    <div class="text-center mb-4">
      <p class="text-gray-700"><strong>Total Results:</strong> ${results.length}</p>
      <p class="text-green-500"><strong>Passed:</strong> ${passed}</p>
      <p class="text-red-500"><strong>Failed:</strong> ${failed}</p>
    </div>
    <div id="pass-fail-pie-chart" class="chart flex justify-center items-center h-64"></div>
  `;

  const width = 250;
  const height = 250;
  const radius = Math.min(width, height) / 2;
  
  // Clear existing SVG
  d3.select('#pass-fail-pie-chart').html('');
  
  const svg = d3.select('#pass-fail-pie-chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', '100%')
    .attr('height', '100%')
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
    .outerRadius(radius * 0.7);
    
  // Add slices with animation
  svg.selectAll('path')
    .data(data_ready)
    .join('path')
    .attr('d', arcGenerator)
    .attr('fill', d => color(d.data.name))
    .attr('stroke', 'white')
    .style('stroke-width', '2px')
    .style('opacity', 0)
    .transition()
    .duration(600)
    .style('opacity', 1);
    
  // Add labels
  svg.selectAll('text')
    .data(data_ready)
    .join('text')
    .text(d => `${d.data.name}: ${((d.data.value / (passed + failed)) * 100).toFixed(1)}%`)
    .attr('transform', d => `translate(${arcGenerator.centroid(d)})`)
    .style('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('fill', 'black')
    .style('font-weight', 'bold')
    .style('opacity', 0)
    .transition()
    .duration(600)
    .style('opacity', 1);
}

// Update Recent Exercises & Projects card
function updateRecentExercises(data) {
  const user = data.user[0];
  const recentExercisesCard = document.querySelector('.card.delay-4');
  const resultsList = document.getElementById('results-list');
  
  if (!resultsList) {
    console.error('Results list container not found');
    return;
  }

  resultsList.innerHTML = '';
  
  user.results.slice(0, 5).forEach(result => {
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

// Update init function
async function init() {
  const data = await fetchUserData();
  if (data) {
    document.getElementById('loading-spinner').style.display = 'none';
    populateUserInfo(data);
    renderLineChart(data);
    renderPieChart(data);
    renderAuditRatioCard(data);
    renderPiscineStatsCard(data);
    updateRecentExercises(data); // Add this line
  }
}

init();