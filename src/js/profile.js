async function fetchUserData() {
  try {
    const jwt = localStorage.getItem('jwt');
    if (!jwt) {
      window.location.href = '/login';
      return;
    }

    const query = `
      query {
        user {
          id
          login
          attrs
          totalUp
          totalDown
          skills: transactions(
            where: {type: {_like: "skill_%"}},
            order_by: {amount: desc}
          ) {
            type
            amount
          }
          transactions(
            where: {
              eventId: {_eq: 75}
            }
            order_by: {
              createdAt: asc
            }
          ) {
            id
            type
            amount
            createdAt
            path
            object {
              id
              name
              type
            }
          }
          progresses(order_by: {createdAt: desc}) {
            id
            grade
            createdAt
            path
            object {
              id
              name
              type
            }
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
    console.log('Raw GraphQL Response:', data);

    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    if (!data.data?.user?.[0]) {
      console.error('Invalid data structure:', data);
      throw new Error('Invalid response data structure');
    }

    return data.data;
  } catch (error) {
    console.error('Detailed error:', error);
    document.getElementById('error-message').textContent = 'Failed to load data: ' + error.message;
    return null;
  }
}

// Helper function for XP formatting
function formatXP(xp) {
  if (typeof xp !== 'number') return '0 XP';
  if (xp >= 1000000) return (xp / 1000000).toFixed(1) + ' MB';
  if (xp >= 1000) return (xp / 1000).toFixed(1) + ' KB';
  return xp.toLocaleString() + ' XP';
}

function populateUserInfo(data) {
  if (!data || !data.user || !data.user[0]) {
    document.getElementById('error-message').textContent = 'No user data available';
    return;
  }

  const user = data.user[0];
  
  const totalXp = user.transactions
    .filter(t => t.type === 'xp')
    .reduce((sum, t) => sum + t.amount, 0);

  const overallGrade = user.results.length > 0 
    ? (user.results.filter(r => r.grade > 0).length / user.results.length * 100).toFixed(1)
    : 0;

  const upVotes = (user.totalUp / 1000000).toFixed(2);
  const downVotes = (user.totalDown / 1000000).toFixed(2);
  const auditRatio = user.totalDown > 0 
    ? Math.round((user.totalUp / user.totalDown) * 10) / 10 
    : 'N/A';

  const userInfoHtml = `
    <h2 class="text-2xl font-semibold text-blue-600 mb-4">User Information</h2>
    <div class="space-y-2">
      <div class="key-value-pair"><span class="key">ID:</span> <span class="value">${user.id}</span></div>
      <div class="key-value-pair"><span class="key">Login:</span> <span class="value">${user.login}</span></div>
      <div class="key-value-pair"><span class="key">Total XP:</span> <span class="value">${Math.round(totalXp).toLocaleString()}</span></div>
      <div class="key-value-pair"><span class="key">Overall Grade:</span> <span class="value">${overallGrade}%</span></div>
      <div class="key-value-pair"><span class="key">Up Votes:</span> <span class="value">${upVotes}M</span></div>
      <div class="key-value-pair"><span class="key">Down Votes:</span> <span class="value">${downVotes}M</span></div>
      <div class="key-value-pair"><span class="key">Audit Ratio:</span> <span class="value">${auditRatio}</span></div>
    </div>
  `;

  document.querySelector('.card.delay-1').innerHTML = userInfoHtml;

  const progressList = document.getElementById('grades-list');
  progressList.innerHTML = '';
  console.log('Progress entries:', user.progresses.slice(0, 5));

  user.progresses.slice(0, 5).forEach(prog => {
    const li = document.createElement('li');
    li.className = 'mb-2 p-2 border-b';
    
    // Determine project status
    let status, statusClass;
    if (prog.grade === null || prog.grade === undefined) {
      status = 'In Progress';
      statusClass = 'text-yellow-500';
    } else if (prog.grade === 0) {
      status = 'Failed';
      statusClass = 'text-red-500';
    } else {
      status = 'Passed';
      statusClass = 'text-green-500';
    }

    li.innerHTML = `
      <span class="font-medium value">${prog.object.name || 'Unnamed'}</span>
      <span class="float-right ${statusClass}">
        ${status}
      </span>
      <br>
      <small class="text-gray-500">
        ${new Date(prog.createdAt).toLocaleDateString()} 
        ${prog.grade !== null ? `(Grade: ${prog.grade})` : ''}
      </small>
    `;
    progressList.appendChild(li);
  });
}

function renderSkillsCard(data) {
  const user = data.user[0];
  const skills = user.skills || [];
  console.log('Raw skills data:', skills);

  const skillsContent = document.querySelector('#audit-stats-card #audit-stats-content');
  if (!skillsContent) {
    console.error('Skills container not found');
    return;
  }

  // Aggregate skills by type
  const skillsMap = skills.reduce((acc, skill) => {
    const type = skill.type.replace('skill_', '');
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type] += skill.amount;
    return acc;
  }, {});

  // Convert to array and sort
  const formattedSkills = Object.entries(skillsMap)
    .map(([name, amount]) => ({
      name: name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      amount: Math.round(amount)
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);  // Keep top 5 skills

  console.log('Aggregated skills:', formattedSkills);

  const maxAmount = formattedSkills[0]?.amount || 0;

  skillsContent.innerHTML = `
    <div class="p-6 bg-white rounded-lg shadow">
      <h3 class="text-xl font-semibold mb-4 text-gray-800">Top Skills</h3>
      ${formattedSkills.length > 0 ? 
        formattedSkills.map(skill => `
          <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
              <span class="text-gray-700 font-medium">${skill.name}</span>
              <span class="text-blue-600 font-semibold">${formatXP(skill.amount)}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2.5">
              <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                style="width: ${(skill.amount / maxAmount * 100).toFixed(1)}%">
              </div>
            </div>
          </div>
        `).join('') :
        '<p class="text-gray-500">No skills data available yet</p>'
      }
    </div>
  `;
}

function renderPiscineStatsCard(data) {
  const user = data.user[0];
  const piscineProjects = user.progresses.filter(p => p.path.includes('piscine'));
  const passed = piscineProjects.filter(p => p.grade > 0).length;
  const failed = piscineProjects.filter(p => p.grade === 0).length;

  const piscineHtml = `
    <div class="space-y-2">
      <div class="key-value-pair"><span class="key">Total Attempts:</span> <span class="value">${piscineProjects.length}</span></div>
      <div class="key-value-pair"><span class="key">Passed:</span> <span class="value">${passed}</span></div>
      <div class="key-value-pair"><span class="key">Failed:</span> <span class="value">${failed}</span></div>
      <div class="key-value-pair"><span class="key">Success Rate:</span> <span class="value">${
        piscineProjects.length > 0 ? ((passed / piscineProjects.length) * 100).toFixed(1) : 0
      }%</span></div>
    </div>
  `;

  const piscineStatsContent = document.querySelector('#piscine-stats-card #piscine-stats-content');
  if (piscineStatsContent) {
    piscineStatsContent.innerHTML = piscineHtml;
  } else {
    console.error('Piscine stats content container not found');
  }
}

function renderLineChart(data) {
  if (!data.user[0].transactions.length) return;

  const margin = {top: 40, right: 60, bottom: 60, left: 100};
  const width = Math.min(1000, window.innerWidth - 100) - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  d3.select('#xp-line-chart').html('');

  const svg = d3.select('#xp-line-chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const xpData = data.user[0].transactions
    .filter(t => t.type === 'xp')
    .map(t => ({
      date: new Date(t.createdAt),
      amount: t.amount
    }))
    .sort((a, b) => a.date - b.date);

  let cumulativeXP = 0;
  const cumulativeData = xpData.map(d => {
    cumulativeXP += d.amount;
    return {
      date: d.date,
      xp: cumulativeXP
    };
  });

  const x = d3.scaleTime()
    .domain(d3.extent(cumulativeData, d => d.date))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(cumulativeData, d => d.xp)])
    .range([height, 0]);

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

  svg.append('g')
    .call(d3.axisLeft(y)
      .tickFormat(d => `${Math.round(d).toLocaleString()} XP`));

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

  const tooltip = d3.select('#xp-line-chart')
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0)
    .style('position', 'absolute')
    .style('background-color', 'rgba(0,0,0,0.7)')
    .style('color', 'white')
    .style('padding', '8px')
    .style('border-radius', '4px');

  // Add a transparent rectangle for tooltip interaction
  svg.append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'transparent')
    .on('mousemove', function(event) {
      const [xPos] = d3.pointer(event);
      const date = x.invert(xPos);
      const bisect = d3.bisector(d => d.date).left;
      const index = bisect(cumulativeData, date, 1);
      const d0 = cumulativeData[index - 1];
      const d1 = cumulativeData[index];
      const d = date - d0.date > d1.date - date ? d1 : d0;

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

function renderPieChart(data) {
  console.log('Rendering pie chart with data:', data);
  
  const user = data.user[0];
  const results = user.results;
  
  const passed = results.filter(r => r.grade > 0).length;
  const failed = results.filter(r => r.grade === 0).length;

  const pieChartCard = document.querySelector('.card.delay-6');
  if (!pieChartCard) {
    console.error('Pie chart container not found');
    return;
  }

  pieChartCard.innerHTML = `
    <h2 class="text-2xl font-semibold text-blue-600 mb-4">Pass/Fail Ratio</h2>
    <div class="text-center mb-4 space-y-2">
      <div class="key-value-pair"><span class="key">Total Results:</span> <span class="value">${results.length}</span></div>
      <div class="key-value-pair"><span class="key">Passed:</span> <span class="value text-green-500">${passed}</span></div>
      <div class="key-value-pair"><span class="key">Failed:</span> <span class="value text-red-500">${failed}</span></div>
    </div>
    <div id="pass-fail-pie-chart" class="chart flex justify-center items-center h-64"></div>
  `;

  if (results.length === 0) {
    document.getElementById('pass-fail-pie-chart').innerHTML = '<p class="text-gray-500">No data available</p>';
    return;
  }

  const width = 250;
  const height = 250;
  const radius = Math.min(width, height) / 2;
  
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
    .range(['#34D399', '#f87171']);
    
  const pie = d3.pie()
    .value(d => d.value);
    
  const data_ready = pie([
    {name: 'Pass', value: passed},
    {name: 'Fail', value: failed}
  ]);

  const arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(radius * 0.7);
    
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

function updateRecentExercises(data) {
  const user = data.user[0];
  const resultsList = document.getElementById('results-list');
  
  if (!resultsList) {
    console.error('Results list container not found');
    return;
  }

  // Filter results to only show current year and sort by date (most recent first)
  const currentYear = new Date().getFullYear();
  const recentResults = user.results
    .filter(result => {
      const resultDate = new Date(result.createdAt);
      return resultDate.getFullYear() <= currentYear;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  resultsList.innerHTML = '';
  
  recentResults.forEach(result => {
    const date = new Date(result.createdAt);
    const formattedDate = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);

    const li = document.createElement('li');
    li.className = 'mb-2 p-2 border-b';
    li.innerHTML = `
      <span class="font-medium value">${result.object?.name || 'Unnamed'}</span>
      <span class="float-right ${result.grade ? 'text-green-500' : 'text-red-500'}">
        ${result.grade ? 'Pass' : 'Fail'}
      </span>
      <br>
      <small class="text-gray-500">${formattedDate}</small>
    `;
    resultsList.appendChild(li);
  });
}

function handleLogout(event) {
  const button = event.target;
  button.disabled = true;
  button.textContent = 'Logging out...';
  localStorage.removeItem('jwt');
  setTimeout(() => {
    window.location.href = '/';
  }, 500); // Brief delay for UX
}

function setupLogout() {
  const logoutButton = document.getElementById('logout-button');
  if (!logoutButton) {
    console.error('Logout button not found');
    return;
  }

  // Remove existing listeners to prevent duplicates
  logoutButton.removeEventListener('click', handleLogout);
  logoutButton.addEventListener('click', handleLogout);
}

document.addEventListener('DOMContentLoaded', () => {
  setupLogout();
});

async function init() {
  const data = await fetchUserData();
  if (data) {
    document.getElementById('loading-spinner').style.display = 'none';
    populateUserInfo(data);
    renderLineChart(data);
    renderPieChart(data);
    renderSkillsCard(data);  // Replace renderAuditRatioCard with renderSkillsCard
    renderPiscineStatsCard(data);
    updateRecentExercises(data);
  }
}

init();