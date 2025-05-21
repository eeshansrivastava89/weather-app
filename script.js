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

    // API Keys (Note: In a production app, these should be secured)
    const openWeatherApiKey = 'c6ec2afba9c9176f522a4084fff12891'; // Replace with your OpenWeatherMap API key
    const noaaApiToken = 'NCuaKzVeoUaErHojaqDNBnLHTjbmfXdR'; // Replace with your NOAA API token

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

    // Function to display weather data
    function displayWeather(data) {
        // Show weather container
        weatherContainer.classList.remove('hidden');
        
        // Update location and date
        cityName.textContent = `${data.name}`;
        const currentDate = new Date();
        dateTime.textContent = currentDate.toLocaleString();
        
        // Update temperature
        temperature.textContent = `${Math.round(data.main.temp)}°F`;
        feelsLike.textContent = `Feels like ${Math.round(data.main.feels_like)}°F`;
        
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
            displayHistoricalWeather(weatherCache[zipCode].data, zipCode, weatherCache[zipCode].dataSource || 'simulated');
            return;
        }
        
        // Calculate date range (90 days ago to today)
        const today = new Date();
        const endDate = today.toISOString().split('T')[0];
        
        const startDate = new Date();
        startDate.setDate(today.getDate() - 90);
        const startDateStr = startDate.toISOString().split('T')[0];
        
        // Try to get NOAA historical data first
        if (noaaApiToken && noaaApiToken !== 'YOUR_NOAA_TOKEN') {
            // First, find the nearest weather station
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
                        dataSource: 'noaa',
                        timestamp: Date.now()
                    };
                    
                    // Display the data
                    displayHistoricalWeather(processedData, zipCode, 'noaa');
                })
                .catch(error => {
                    console.error('Error fetching NOAA data:', error);
                    historicalError.textContent = `Error: ${error.message}. Falling back to forecast and simulated data.`;
                    
                    // Fall back to forecast + simulated data
                    fetchForecastAndSimulate(lat, lon, zipCode);
                });
        } else {
            // No NOAA API token, use forecast + simulated data
            fetchForecastAndSimulate(lat, lon, zipCode);
        }
    }
    
    // Function to fetch forecast data and simulate the rest
    function fetchForecastAndSimulate(lat, lon, zipCode) {
        fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${openWeatherApiKey}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Unable to fetch forecast data');
                }
                return response.json();
            })
            .then(data => {
                // Get actual forecast data for 5 days
                const forecastData = processForecastData(data);
                
                // Generate simulated data for the remaining days
                const simulatedData = generateSimulatedData(forecastData, zipCode);
                
                // Cache the data
                weatherCache[zipCode] = {
                    data: simulatedData,
                    dataSource: 'simulated',
                    timestamp: Date.now()
                };
                
                // Display the data
                displayHistoricalWeather(simulatedData, zipCode, 'simulated');
            })
            .catch(error => {
                console.error('Error fetching forecast data:', error);
                historicalError.textContent = '';
                
                // If the forecast data fails, generate all simulated data
                const simulatedData = generateSimulatedData([], zipCode);
                
                // Cache the data
                weatherCache[zipCode] = {
                    data: simulatedData,
                    dataSource: 'simulated',
                    timestamp: Date.now()
                };
                
                // Display the data
                displayHistoricalWeather(simulatedData, zipCode, 'simulated');
            });
    }
    
    // Process the 5-day forecast data
    function processForecastData(data) {
        const processed = [];
        const today = new Date();
        
        // Group by day and get one reading per day
        const groupedByDay = {};
        
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dateStr = date.toISOString().split('T')[0];
            
            if (!groupedByDay[dateStr]) {
                groupedByDay[dateStr] = [];
            }
            
            groupedByDay[dateStr].push({
                date: date,
                temp: item.main.temp,
                condition: item.weather[0].description,
                humidity: item.main.humidity,
                wind: item.wind.speed
            });
        });
        
        // Get one reading per day (noon if available)
        Object.keys(groupedByDay).forEach(dateStr => {
            const dayData = groupedByDay[dateStr];
            let selectedReading;
            
            // Try to get reading closest to noon
            const noonReadings = dayData.map(reading => {
                const hour = reading.date.getHours();
                return {
                    reading,
                    distance: Math.abs(hour - 12)
                };
            }).sort((a, b) => a.distance - b.distance);
            
            selectedReading = noonReadings[0].reading;
            processed.push(selectedReading);
        });
        
        return processed;
    }
    
    // Generate simulated historical weather data
    function generateSimulatedData(forecastData, zipCode) {
        const result = [...forecastData];
        const daysNeeded = 90 - forecastData.length;
        const today = new Date();
        
        // Base values for simulation (these would come from current weather in a real app)
        let baseTemp = Math.round(40 + Math.random() * 50); // 40-90°F
        let baseHumidity = Math.round(30 + Math.random() * 50); // 30-80%
        let baseWind = Math.round(5 + Math.random() * 10); // 5-15 mph
        const conditions = [
            'clear sky', 'few clouds', 'scattered clouds', 'broken clouds', 
            'shower rain', 'rain', 'thunderstorm', 'snow', 'mist'
        ];
        
        // Generate data for past days
        for (let i = 0; i < daysNeeded; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - (i + forecastData.length));
            
            // Add some natural variation
            const tempVariation = Math.random() * 10 - 5; // -5 to +5
            const humidityVariation = Math.random() * 20 - 10; // -10 to +10
            const windVariation = Math.random() * 5 - 2.5; // -2.5 to +2.5
            
            // Seasonal adjustment based on month (very simplified)
            const month = date.getMonth();
            let seasonalAdjustment = 0;
            
            // Northern Hemisphere seasons (simplified)
            if (month >= 0 && month <= 2) { // Winter
                seasonalAdjustment = -15;
            } else if (month >= 3 && month <= 5) { // Spring
                seasonalAdjustment = 0;
            } else if (month >= 6 && month <= 8) { // Summer
                seasonalAdjustment = 15;
            } else { // Fall
                seasonalAdjustment = 0;
            }
            
            const temp = Math.max(0, Math.min(100, baseTemp + tempVariation + seasonalAdjustment));
            const humidity = Math.max(10, Math.min(100, baseHumidity + humidityVariation));
            const wind = Math.max(0, baseWind + windVariation);
            
            // Choose a condition that makes sense for the temperature
            let conditionIndex;
            if (temp < 32) {
                conditionIndex = Math.floor(Math.random() * 2) + 7; // snow or mist
            } else if (temp > 85) {
                conditionIndex = Math.floor(Math.random() * 3); // clear or few clouds
            } else {
                conditionIndex = Math.floor(Math.random() * conditions.length);
            }
            
            result.push({
                date: date,
                temp: temp,
                condition: conditions[conditionIndex],
                humidity: humidity,
                wind: wind
            });
            
            // Update base values to create some trend
            baseTemp += (Math.random() - 0.5) * 2; // Slight random drift
            baseHumidity += (Math.random() - 0.5) * 2;
            baseWind += (Math.random() - 0.5);
        }
        
        // Sort by date (newest first)
        result.sort((a, b) => b.date - a.date);
        
        return result;
    }
    
    // Display historical weather data
    function displayHistoricalWeather(data, zipCode, dataSource = 'simulated') {
        // Hide loading message
        historicalLoading.classList.add('hidden');
        
        // Set data source label
        dataSourceLabel.textContent = dataSource === 'noaa' ? 'Source: NOAA Official Data' : 'Source: Simulated Data';
        dataSourceLabel.className = 'data-source-label ' + dataSource;
        
        // Clear previous data
        historicalData.innerHTML = '';
        
        // Add data to table
        data.forEach(dayData => {
            const row = document.createElement('tr');
            
            const dateCell = document.createElement('td');
            dateCell.textContent = dayData.date.toLocaleDateString();
            row.appendChild(dateCell);
            
            const tempCell = document.createElement('td');
            tempCell.textContent = `${Math.round(dayData.temp)}°F`;
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
