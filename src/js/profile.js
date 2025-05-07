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

// Update renderLineChart function
function renderLineChart(data) {
  if (!data.user[0].transactions.length) return;

  const margin = {top: 40, right: 60, bottom: 60, left: 80};
  const width = 1000 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

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

  // Add axis labels
  svg.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "middle")
    .attr("x", width/2)
    .attr("y", height + 50)
    .text("Time");

  svg.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "middle")
    .attr("y", -60)
    .attr("x", -height/2)
    .attr("dy", ".75em")
    .attr("transform", "rotate(-90)")
    .text("Experience Points (XP)");

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
  const user = data.user[0];
  const results = user.results;
  
  const passed = results.filter(r => r.grade > 0).length;
  const failed = results.filter(r => r.grade === 0).length;
  
  const width = 300; // Reduced from 400
  const height = 300; // Reduced from 400
  const radius = Math.min(width, height) / 2;
  
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
    .style('text-anchor', "middle")
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