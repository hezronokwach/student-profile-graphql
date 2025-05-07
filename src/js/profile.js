// Example profile.js with updates integrated
async function fetchUserData() {
  try {
    // Simulate fetching data (replace with your actual API call)
    const response = await fetch('https://learn.zone01kisumu.ke/api/graphql-engine/v1/graphql'); // Adjust endpoint as needed
    const userData = await response.json();
    return userData;
  } catch (error) {
    document.getElementById('error-message').textContent = 'Failed to load data.';
    console.error(error);
  }
}

function populateUserInfo(data) {
  // Remove brackets by assigning direct values
  document.getElementById('user-id').textContent = data.user[0].id; // Adjust based on your data structure
  document.getElementById('user-login').textContent = data.user[0].login;
  document.getElementById('total-xp').textContent = data.user[0].totalXp || '0';
}

function populateGrades(data) {
  const gradesList = document.getElementById('grades-list');
  gradesList.innerHTML = '';
  data.progress.forEach(progress => {
    const li = document.createElement('li');
    const formattedDate = new Date(progress.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    li.textContent = `${progress.object.name}: ${progress.grade === 1 ? 'Pass' : 'Fail'} (Date: ${formattedDate})`;
    gradesList.appendChild(li);
  });
}

function renderLineChart(data) {
  const svg = d3.select('#xp-line-chart').append('svg').attr('width', 400).attr('height', 300);
  const margin = { top: 20, right: 20, bottom: 30, left: 50 };
  const width = 400 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleTime().range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);
  
  const cumulativeData = data.progress.map(d => ({ date: new Date(d.createdAt), cumulativeXp: d.amount }));
  x.domain(d3.extent(cumulativeData, d => d.date));
  y.domain([0, d3.max(cumulativeData, d => d.cumulativeXp)]);

  // Area fill
  g.append('path')
    .datum(cumulativeData)
    .attr('fill', 'rgba(52, 152, 219, 0.2)')
    .attr('d', d3.area().x(d => x(d.date)).y0(height).y1(d => y(d.cumulativeXp)));

  // Line
  g.append('path')
    .datum(cumulativeData)
    .attr('fill', 'none')
    .attr('stroke', '#3498db')
    .attr('stroke-width', 2)
    .attr('d', d3.line().x(d => x(d.date)).y(d => y(d.cumulativeXp)));

  g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
  g.append('g').call(d3.axisLeft(y));
}

function renderBarChart(data) {
  const svg = d3.select('#exercise-project-bar-chart').append('svg').attr('width', 400).attr('height', 300);
  const margin = { top: 20, right: 20, bottom: 30, left: 50 };
  const width = 400 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const exerciseProjectData = [
    { label: 'Exercises', count: data.exercises.length, color: '#3498db' },
    { label: 'Projects', count: data.projects.length, color: '#e67e22' }
  ];

  const x = d3.scaleBand().range([0, width]).padding(0.1);
  const y = d3.scaleLinear().range([height, 0]);
  x.domain(exerciseProjectData.map(d => d.label));
  y.domain([0, d3.max(exerciseProjectData, d => d.count)]);

  const bars = g.selectAll('.bar')
    .data(exerciseProjectData)
    .enter().append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.label))
    .attr('y', d => y(d.count))
    .attr('width', x.bandwidth())
    .attr('height', d => height - y(d.count))
    .attr('fill', d => d.color);

  // Add labels
  g.selectAll('.bar-label')
    .data(exerciseProjectData)
    .enter().append('text')
    .attr('x', d => x(d.label) + x.bandwidth() / 2)
    .attr('y', d => y(d.count) - 5)
    .attr('text-anchor', 'middle')
    .attr('fill', '#333')
    .text(d => d.count);

  g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
  g.append('g').call(d3.axisLeft(y));
}

async function init() {
  const data = await fetchUserData();
  if (data) {
    document.getElementById('loading-spinner').style.display = 'none';
    populateUserInfo(data);
    populateGrades(data);
    renderLineChart(data);
    renderBarChart(data);
    // Add pie chart rendering here if needed
  }
}

init();