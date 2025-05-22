document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const zipCodeInput = document.getElementById('zip-code');
    const searchBtn = document.getElementById('search-btn');
    const errorMessage = document.getElementById('error-message');
    const weatherContainer = document.getElementById('weather-container');
    const cityName = document.getElementById('city-name');
    const dateTime = document.getElementById('date-time');
    const temperature = document.getElementById('temperature');
    const feelsLike = document.getElementById('feels-like');
    const condition = document.getElementById('condition');
    const humidity = document.getElementById('humidity');
    const wind = document.getElementById('wind');
    const weatherIcon = document.getElementById('weather-icon');
    const historicalDataContainer = document.getElementById('historical-data-container');
    const historicalData = document.getElementById('historical-data');
    const historicalLoading = document.getElementById('historical-loading');
    const historicalError = document.getElementById('historical-error');
    const dataSourceLabel = document.getElementById('data-source-label');
    const graphContainer = document.getElementById('graph-container');
    const temperatureChart = document.getElementById('temperature-chart');
    
    // Chart instance
    let tempChart = null;

    // Weather data cache
    const weatherCache = {};

    // API Keys from config.js
    const openWeatherApiKey = CONFIG.OPEN_WEATHER_API_KEY || ''; 
    const noaaApiToken = CONFIG.NOAA_API_TOKEN || '';

    // Event listeners
    searchBtn.addEventListener('click', getWeather);
    zipCodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            getWeather();
        }
    });

    // Function to get weather data
    function getWeather() {
        const zipCode = zipCodeInput.value.trim();
        
        // Input validation
        if (!zipCode) {
            displayError('Please enter a zip code');
            return;
        }
        
        if (!validateZipCode(zipCode)) {
            displayError('Please enter a valid 5-digit US zip code');
            return;
        }
        
        // Clear previous error
        errorMessage.textContent = '';
        
        // Fetch weather data
        fetch(`https://api.openweathermap.org/data/2.5/weather?zip=${zipCode},us&units=imperial&appid=${openWeatherApiKey}`)
            .then(response => {
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Zip code not found. Please check and try again.');
                    } else if (response.status === 401) {
                        throw new Error('API key is invalid or not set. Please check your configuration.');
                    } else {
                        throw new Error('Unable to fetch weather data. Please try again later.');
                    }
                }
                return response.json();
            })
            .then(data => {
                displayWeather(data);
                // Get historical weather data
                getHistoricalWeather(data.coord.lat, data.coord.lon, zipCode);
            })
            .catch(error => {
                displayError(error.message);
                weatherContainer.classList.add('hidden');
            });
    }

    // Function to convert Fahrenheit to Celsius
    function fahrenheitToCelsius(fahrenheit) {
        return (fahrenheit - 32) * 5/9;
    }
    
    // Function to display weather data
    function displayWeather(data) {
        // Show weather container
        weatherContainer.classList.remove('hidden');
        
        // Update location and date
        cityName.textContent = `${data.name}`;
        const currentDate = new Date();
        dateTime.textContent = currentDate.toLocaleString();
        
        // Update temperature with both Fahrenheit and Celsius
        const tempF = Math.round(data.main.temp);
        const tempC = Math.round(fahrenheitToCelsius(data.main.temp));
        temperature.textContent = `${tempF}°F (${tempC}°C)`;
        
        // Update feels like temperature with both Fahrenheit and Celsius
        const feelsLikeF = Math.round(data.main.feels_like);
        const feelsLikeC = Math.round(fahrenheitToCelsius(data.main.feels_like));
        feelsLike.textContent = `Feels like ${feelsLikeF}°F (${feelsLikeC}°C)`;
        
        // Update conditions
        condition.textContent = data.weather[0].description.charAt(0).toUpperCase() + 
                               data.weather[0].description.slice(1);
        humidity.textContent = `${data.main.humidity}%`;
        wind.textContent = `${Math.round(data.wind.speed)} mph`;
        
        // Update weather icon
        const iconCode = data.weather[0].icon;
        weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        weatherIcon.alt = data.weather[0].description;
    }

    // Function to get historical weather data
    function getHistoricalWeather(lat, lon, zipCode) {
        // Show loading message
        historicalDataContainer.classList.remove('hidden');
        historicalLoading.classList.remove('hidden');
        historicalError.textContent = '';
        historicalData.innerHTML = '';            // Check if we have cached data for this zip code
        if (weatherCache[zipCode] && weatherCache[zipCode].timestamp > Date.now() - 3600000) {
            displayHistoricalWeather(weatherCache[zipCode].data, zipCode);
            return;
        }
        
        // Calculate date range (90 days ago to today)
        const today = new Date();
        const endDate = today.toISOString().split('T')[0];
        
        const startDate = new Date();
        startDate.setDate(today.getDate() - 90);
        const startDateStr = startDate.toISOString().split('T')[0];
        
        // Verify NOAA API token is available
        if (!noaaApiToken || noaaApiToken === 'YOUR_NOAA_TOKEN') {
            historicalError.textContent = 'NOAA API token is required for historical data. Please add your token in config.js';
            historicalLoading.classList.add('hidden');
            return;
        }
        
        // Fetch NOAA historical data
        fetchNearestStation(lat, lon, startDateStr, endDate, noaaApiToken)
            .then(stationData => {
                if (!stationData || !stationData.results || stationData.results.length === 0) {
                    throw new Error('No weather stations found near this location');
                }
                
                // Get the station ID
                const stationId = stationData.results[0].id;
                
                // Now fetch the data from this station
                return fetchStationData(stationId, startDateStr, endDate, noaaApiToken);
            })
            .then(historicalData => {
                if (!historicalData || !historicalData.results || historicalData.results.length === 0) {
                    throw new Error('No historical data available for this location');
                }
                
                // Process the NOAA data into our format
                const processedData = processNoaaData(historicalData.results);
                
                // Cache the data
                weatherCache[zipCode] = {
                    data: processedData,
                    timestamp: Date.now()
                };
                
                // Display the data
                displayHistoricalWeather(processedData, zipCode);
            })
            .catch(error => {
                console.error('Error fetching NOAA data:', error);
                historicalError.textContent = `Error: ${error.message}. Please try a different location or check your NOAA API token.`;
                historicalLoading.classList.add('hidden');
            });
    }
    
    // Display historical weather data
    function displayHistoricalWeather(data, zipCode) {
        // Hide loading message
        historicalLoading.classList.add('hidden');
        
        // Set data source label
        dataSourceLabel.textContent = 'Source: NOAA Official Data';
        dataSourceLabel.className = 'data-source-label noaa';
        
        // Clear previous data
        historicalData.innerHTML = '';
        
        // Add data to table
        data.forEach(dayData => {
            const row = document.createElement('tr');
            
            const dateCell = document.createElement('td');
            dateCell.textContent = dayData.date.toLocaleDateString();
            row.appendChild(dateCell);
            
            const tempCell = document.createElement('td');
            const tempF = Math.round(dayData.temp);
            const tempC = Math.round(fahrenheitToCelsius(dayData.temp));
            tempCell.textContent = `${tempF}°F (${tempC}°C)`;
            row.appendChild(tempCell);
            
            const conditionCell = document.createElement('td');
            conditionCell.textContent = dayData.condition.charAt(0).toUpperCase() + 
                                      dayData.condition.slice(1);
            row.appendChild(conditionCell);
            
            const humidityCell = document.createElement('td');
            humidityCell.textContent = `${Math.round(dayData.humidity)}%`;
            row.appendChild(humidityCell);
            
            const windCell = document.createElement('td');
            windCell.textContent = `${Math.round(dayData.wind)} mph`;
            row.appendChild(windCell);
            
            historicalData.appendChild(row);
        });
        
        // Create and display the temperature chart
        createTemperatureChart(data);
    }
    
    // Create temperature chart from historical data
    function createTemperatureChart(data) {
        // Show the graph container
        graphContainer.classList.remove('hidden');
        
        // First, get the data in chronological order (oldest to newest)
        const chronologicalData = [...data].sort((a, b) => a.date - b.date);
        
        // Extract dates and temperatures
        const dates = chronologicalData.map(day => day.date.toLocaleDateString());
        const temperatures = chronologicalData.map(day => Math.round(day.temp));
        
        // Calculate 7-day moving average
        const movingAvgTemps = calculateMovingAverage(temperatures, 7);
        
        // If there's an existing chart, destroy it
        if (tempChart) {
            tempChart.destroy();
        }
        
        // Create the chart
        tempChart = new Chart(temperatureChart, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Daily Temperature (°F)',
                        data: temperatures,
                        borderColor: 'rgba(75, 108, 183, 0.7)',
                        backgroundColor: 'rgba(75, 108, 183, 0.3)',
                        pointRadius: 2,
                        pointHoverRadius: 5,
                        borderWidth: 1,
                        fill: true,
                        tension: 0.2
                    },
                    {
                        label: '7-Day Average',
                        data: movingAvgTemps,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0)',
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 0,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Date'
                        },
                        ticks: {
                            maxTicksLimit: 12,
                            autoSkip: true
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Temperature (°F)'
                        },
                        suggestedMin: Math.min(...temperatures) - 5,
                        suggestedMax: Math.max(...temperatures) + 5
                    }
                }
            }
        });
    }
    
    // Calculate moving average
    function calculateMovingAverage(data, window) {
        const result = [];
        
        // For the beginning of the array where we don't have enough previous values
        for (let i = 0; i < window - 1; i++) {
            const slice = data.slice(0, i + 1);
            const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
            result.push(avg);
        }
        
        // For the rest of the array
        for (let i = window - 1; i < data.length; i++) {
            const slice = data.slice(i - window + 1, i + 1);
            const avg = slice.reduce((sum, val) => sum + val, 0) / window;
            result.push(avg);
        }
        
        return result;
    }

    // Function to display error message
    function displayError(message) {
        errorMessage.textContent = message;
    }

    // Function to validate US zip code (5 digits)
    function validateZipCode(zipCode) {
        return /^\d{5}$/.test(zipCode);
    }
});
