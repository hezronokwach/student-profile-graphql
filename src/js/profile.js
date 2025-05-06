import { GraphQLClient } from 'graphql-request';
import { jwtDecode } from 'jwt-decode';

document.addEventListener('DOMContentLoaded', async () => {
  const errorMessage = document.getElementById('error-message');
  const userIdSpan = document.getElementById('user-id');
  const userLoginSpan = document.getElementById('user-login');
  const totalXpSpan = document.getElementById('total-xp');
  const gradesList = document.getElementById('grades-list');
  const logoutButton = document.getElementById('logout-button');
  const loadingSpinner = document.getElementById('loading-spinner');

  // Check for JWT
  const jwt = localStorage.getItem('jwt');
  if (!jwt) {
    window.location.href = '../pages/login.html';
    return;
  }

  // Show loading spinner
  loadingSpinner.classList.add('active');

  // Decode JWT to get user ID
  let userId;
  try {
    const decoded = jwtDecode(jwt);
    userId = decoded.sub || decoded.id;
    console.log('Decoded JWT:', decoded);
  } catch (error) {
    errorMessage.textContent = 'Invalid JWT';
    console.error('JWT decode error:', error);
    loadingSpinner.classList.remove('active');
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
    console.log('User Data:', userData);
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
    console.log('XP Data:', xpData);
    const totalXp = xpData.transaction ? xpData.transaction.reduce((sum, tx) => sum + tx.amount, 0) : 0;
    console.log('Total XP:', totalXp);
    totalXpSpan.textContent = `${totalXp} XP`;

    // Nested query: Fetch recent grades
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
    console.log('Grades Data:', gradesData);
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

    // Process data for graphs
    // Line Chart: XP over time
    const xpChartData = xpData.transaction
      .map(tx => ({
        date: new Date(tx.createdAt),
        amount: tx.amount
      }))
      .sort((a, b) => a.date - b.date);

    let cumulativeXp = 0;
    const cumulativeData = xpChartData.map(d => {
      cumulativeXp += d.amount;
      return { date: d.date, cumulativeXp };
    });

    // Pie Chart: Pass/Fail ratio
    const passFailData = [
      { label: 'Pass', count: gradesData.progress.filter(p => p.grade === 1).length },
      { label: 'Fail', count: gradesData.progress.filter(p => p.grade === 0).length }
    ].filter(d => d.count > 0);

    // Render Line Chart
    const lineChart = d3.select('#xp-line-chart');
    lineChart.append('div')
      .attr('class', 'chart-title')
      .text('XP Over Time');

    const lineSvg = lineChart.append('svg');
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 350 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const g = lineSvg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(cumulativeData, d => d.date))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(cumulativeData, d => d.cumulativeXp)])
      .range([height, 0]);

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');

    g.append('g')
      .call(d3.axisLeft(y))
      .append('text')
      .attr('fill', '#000')
      .attr('transform', 'rotate(-90)')
      .attr('y', 6)
      .attr('dy', '0.71em')
      .attr('text-anchor', 'end')
      .text('Cumulative XP');

    g.append('path')
      .datum(cumulativeData)
      .attr('fill', 'none')
      .attr('stroke', '#007bff')
      .attr('stroke-width', 2)
      .attr('d', d3.line()
        .x(d => x(d.date))
        .y(d => y(d.cumulativeXp)));

    // Add points and tooltips for line chart
    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    g.selectAll('dot')
      .data(cumulativeData)
      .enter()
      .append('circle')
      .attr('r', 5)
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(d.cumulativeXp))
      .attr('fill', '#007bff')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('r', 7);
        tooltip.transition().duration(200).style('opacity', .9);
        tooltip.html(`Date: ${d.date.toLocaleDateString()}<br>XP: ${d.cumulativeXp}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function () {
        d3.select(this).attr('r', 5);
        tooltip.transition().duration(500).style('opacity', 0);
      });

    // Render Pie Chart
    const pieChart = d3.select('#pass-fail-pie-chart');
    pieChart.append('div')
      .attr('class', 'chart-title')
      .text('Pass/Fail Ratio');

    const pieSvg = pieChart.append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const pieG = pieSvg.append('g')
      .attr('transform', `translate(${width / 2 + margin.left},${height / 2 + margin.top})`);

    const radius = Math.min(width, height) / 2;
    const pie = d3.pie()
      .value(d => d.count);

    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(radius);

    const arcs = pieG.selectAll('arc')
      .data(pie(passFailData))
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.label === 'Pass' ? '#28a745' : '#dc3545')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.8);
        tooltip.transition().duration(200).style('opacity', .9);
        tooltip.html(`${d.data.label}: ${d.data.count}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 1);
        tooltip.transition().duration(500).style('opacity', 0);
      });

    arcs.append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .text(d => `${d.data.label}: ${d.data.count}`);

    // Hide loading spinner
    loadingSpinner.classList.remove('active');
  } catch (error) {
    errorMessage.textContent = 'Error fetching profile data or rendering graphs. Please try again.';
    console.error('GraphQL error:', error);
    loadingSpinner.classList.remove('active');
  }

  // Handle logout
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('jwt');
    window.location.href = '../pages/login.html';
  });
});