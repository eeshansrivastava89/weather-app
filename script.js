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
    const precipitation = document.getElementById('precipitation');
    const weatherIcon = document.getElementById('weather-icon');
    const historicalDataContainer = document.getElementById('historical-data-container');
    const historicalData = document.getElementById('historical-data');
    const historicalError = document.getElementById('historical-error');
    const dataSourceLabel = document.getElementById('data-source-label');
    const graphContainer = document.getElementById('graph-container');
    const temperatureChart = document.getElementById('temperature-chart');
    
    // Chart instance
    let tempChart = null;

    // Weather data cache
    const weatherCache = {};

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
        
        // Convert ZIP to lat/lon using Zippopotam.us
        fetch(`https://api.zippopotam.us/us/${zipCode}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Zip code not found. Please check and try again.');
                }
                return response.json();
            })
            .then(locationData => {
                const place = locationData.places[0];
                const lat = parseFloat(place.latitude);
                const lon = parseFloat(place.longitude);
                const city = place["place name"];
                // Fetch current weather from Open-Meteo
                fetchCurrentWeather(lat, lon, city, zipCode);
            })
            .catch(error => {
                displayError(error.message);
                weatherContainer.classList.add('hidden');
                historicalDataContainer.classList.add('hidden');
            });
    }

    // Fetch current weather from Open-Meteo
    function fetchCurrentWeather(lat, lon, city, zipCode) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch&timezone=auto`;
        
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Unable to fetch current weather.');
                }
                return response.json();
            })
            .then(data => {
                if (!data.current) {
                    throw new Error('No current weather data available.');
                }
                
                displayWeather(data.current, city);
                // Fetch historical weather
                getHistoricalWeather(lat, lon, zipCode);
            })
            .catch(error => {
                displayError(error.message);
                weatherContainer.classList.add('hidden');
                historicalDataContainer.classList.add('hidden');
            });
    }
    
    // Function to display weather data
    function displayWeather(current, city) {
        // Show weather container
        weatherContainer.classList.remove('hidden');
        
        // Update location and date
        cityName.textContent = city;
        const currentDate = new Date(current.time);
        dateTime.textContent = currentDate.toLocaleString();
        
        // Update temperature with both Fahrenheit and Celsius
        const tempF = Math.round(current.temperature_2m);
        const tempC = Math.round(fahrenheitToCelsius(current.temperature_2m));
        temperature.textContent = `${tempF}°F (${tempC}°C)`;
        
        // Update feels like temperature with both Fahrenheit and Celsius
        const feelsLikeF = Math.round(current.apparent_temperature);
        const feelsLikeC = Math.round(fahrenheitToCelsius(current.apparent_temperature));
        feelsLike.textContent = `Feels like ${feelsLikeF}°F (${feelsLikeC}°C)`;
        
        // Update conditions
        const weatherDescription = codeToDescription(current.weather_code);
        condition.textContent = weatherDescription;
        humidity.textContent = `${current.relative_humidity_2m}%`;
        wind.textContent = `${Math.round(current.wind_speed_10m)} mph`;
        precipitation.textContent = `${current.precipitation} in`;
        
        // Update weather icon
        weatherIcon.src = getWeatherIcon(current.weather_code);
        weatherIcon.alt = weatherDescription;
    }

    // Function to get historical weather data
    function getHistoricalWeather(lat, lon, zipCode) {
        // Show historical container and reset previous data
        historicalDataContainer.classList.remove('hidden');
        historicalError.classList.add('hidden');
        historicalError.textContent = '';
        historicalData.innerHTML = '';
        
        // Check if we have cached data for this zip code
        if (weatherCache[zipCode] && weatherCache[zipCode].timestamp > Date.now() - 3600000) {
            displayHistoricalWeather(weatherCache[zipCode].data, zipCode);
            return;
        }
        
        // Calculate date range (90 days ago to today)
        const today = new Date();
        const endDate = today;
        const endDateStr = endDate.toISOString().split('T')[0];
        
        const startDate = new Date();
        startDate.setDate(today.getDate() - 90);
        const startDateStr = startDate.toISOString().split('T')[0];
        
        console.log(`Fetching historical data from ${startDateStr} to ${endDateStr}`);
        
        // Get the current day's data immediately
        getCurrentDayData(lat, lon).then(currentDayData => {
            console.log("Current day data:", currentDayData);
            
            // Then get forecast and historical data
            Promise.all([
                getForecastData(lat, lon),
                getHistoricalArchiveData(lat, lon, startDateStr, endDateStr)
            ])
            .then(([forecastData, historicalData]) => {
                // Combine historical and forecast data
                let combinedData = combineHistoricalAndForecast(historicalData, forecastData);
                
                // Add current day data if available
                if (currentDayData) {
                    // Create a set of dates we already have
                    const existingDates = new Set(combinedData.map(d => d.date.toISOString().split('T')[0]));
                    
                    // Add current day data if not already present
                    if (!existingDates.has(currentDayData.date.toISOString().split('T')[0])) {
                        combinedData.push(currentDayData);
                    }
                }
                
                // Cache the combined data
                weatherCache[zipCode] = {
                    data: combinedData,
                    timestamp: Date.now()
                };
                
                // Display the data
                displayHistoricalWeather(combinedData, zipCode);
            })
            .catch(error => {
                console.error('Error fetching weather data:', error);
                historicalError.textContent = `Error: ${error.message}`;
                historicalError.classList.remove('hidden');
            });
        })
        .catch(error => {
            console.error('Error fetching current day data:', error);
            // Continue with the rest of the process even if current day data fails
            Promise.all([
                getForecastData(lat, lon),
                getHistoricalArchiveData(lat, lon, startDateStr, endDateStr)
            ])
            .then(([forecastData, historicalData]) => {
                const combinedData = combineHistoricalAndForecast(historicalData, forecastData);
                weatherCache[zipCode] = {
                    data: combinedData,
                    timestamp: Date.now()
                };
                displayHistoricalWeather(combinedData, zipCode);
            })
            .catch(error => {
                console.error('Error fetching weather data:', error);
                historicalError.textContent = `Error: ${error.message}`;
                historicalError.classList.remove('hidden');
            });
        });
    }
    
    // Get current day data from current weather API
    async function getCurrentDayData(lat, lon) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,wind_speed_10m_max&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto&forecast_days=1`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Unable to fetch current day data');
            }
            
            const data = await response.json();
            if (!data.daily || !data.daily.time || !data.daily.time[0] || !data.current) {
                throw new Error('Invalid current day data response');
            }
            
            // Create a data point for today using both current and daily data
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            return {
                date: today,
                temp: data.current.temperature_2m,
                tempMax: data.daily.temperature_2m_max[0],
                tempMin: data.daily.temperature_2m_min[0],
                humidity: data.current.relative_humidity_2m,
                condition: codeToDescription(data.current.weather_code),
                wind: data.current.wind_speed_10m
            };
        } catch (error) {
            console.error('Error fetching current day data:', error);
            return null;
        }
    }
    
    // Get forecast data (includes today and next few days)
    async function getForecastData(lat, lon) {
        // Using forecast for today and next few days to fill the gap from archive API
        // This ensures we have data for the most recent days
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,relative_humidity_2m_mean,wind_speed_10m_max,precipitation_sum&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=8`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Unable to fetch forecast data');
            }
            
            const data = await response.json();
            if (!data.daily || !data.daily.time) {
                return [];
            }
            
            // Process forecast data but mark future days as forecasts
            const processedData = processHistoricalData(data.daily);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // For each day, mark if it's a forecast (future date)
            processedData.forEach(day => {
                const dayDate = new Date(day.date);
                dayDate.setHours(0, 0, 0, 0);
                day.isForecast = dayDate > today;
                
                // Append "(Forecast)" to condition for future days
                if (day.isForecast) {
                    day.condition += " (Forecast)";
                }
            });
            
            console.log("Forecast data includes:", processedData.map(d => d.date.toLocaleDateString()));
            return processedData;
        } catch (error) {
            console.error('Error fetching forecast:', error);
            return [];
        }
    }
    
    // Get historical archive data
    async function getHistoricalArchiveData(lat, lon, startDate, endDate) {
        // Note: Archive API often lags behind by a few days, so we'll use a date a few days before today
        const today = new Date();
        const adjustedEndDate = new Date(today);
        adjustedEndDate.setDate(today.getDate() - 3);  // Go back 3 days to avoid the lag
        const adjustedEndDateStr = adjustedEndDate.toISOString().split('T')[0];
        
        console.log(`Using adjusted end date for archive: ${adjustedEndDateStr} (to avoid data lag)`);
        
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${adjustedEndDateStr}&daily=weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,relative_humidity_2m_mean,wind_speed_10m_max,precipitation_sum&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Unable to fetch historical weather data');
            }
            
            const data = await response.json();
            if (!data.daily || !data.daily.time) {
                return [];
            }
            
            return processHistoricalData(data.daily);
        } catch (error) {
            console.error('Error fetching historical data:', error);
            return [];
        }
    }
    
    // Combine historical and forecast data, removing duplicates
    function combineHistoricalAndForecast(historicalData, forecastData) {
        // Create a map of existing dates to avoid duplicates
        const combinedData = [];
        const dateMap = new Map();
        
        // Add all historical data first
        historicalData.forEach(day => {
            const dateStr = day.date.toISOString().split('T')[0];
            dateMap.set(dateStr, true);
            combinedData.push(day);
        });
        
        // Add forecast data, using it to fill in any missing recent days
        forecastData.forEach(day => {
            const dateStr = day.date.toISOString().split('T')[0];
            if (!dateMap.has(dateStr)) {
                dateMap.set(dateStr, true);
                combinedData.push(day);
            }
        });
        
        // Fill in any missing days between historical and forecast data
        // This ensures we have continuous data even if there are gaps
        if (combinedData.length > 0) {
            const sortedDates = combinedData
                .map(day => day.date.getTime())
                .sort((a, b) => a - b);
            
            const earliestDate = new Date(sortedDates[0]);
            const latestDate = new Date(sortedDates[sortedDates.length - 1]);
            
            console.log(`Date range in combined data: ${earliestDate.toLocaleDateString()} to ${latestDate.toLocaleDateString()}`);
            
            // Add missing dates from the list of dates for debugging
            const allDateStrings = combinedData.map(day => day.date.toLocaleDateString());
            console.log("All dates in combined data:", allDateStrings.sort());
        }
        
        return combinedData;
    }
    
    // Process Open-Meteo historical data
    function processHistoricalData(daily) {
        const result = [];
        
        for (let i = 0; i < daily.time.length; i++) {
            // Skip dates with no data
            if (daily.temperature_2m_max[i] === null && daily.temperature_2m_min[i] === null) {
                continue;
            }
            
            // Create a data point for each day
            const day = {
                date: new Date(daily.time[i]),
                temp: daily.temperature_2m_mean ? daily.temperature_2m_mean[i] : 
                      ((daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2),
                tempMax: daily.temperature_2m_max[i],
                tempMin: daily.temperature_2m_min[i],
                humidity: daily.relative_humidity_2m_mean ? daily.relative_humidity_2m_mean[i] : 50, // Default if not available
                condition: codeToDescription(daily.weather_code[i]),
                wind: daily.wind_speed_10m_max[i],
                precipitation: daily.precipitation_sum ? daily.precipitation_sum[i] : 0
            };
            
            result.push(day);
        }
        
        return result;
    }
    
    // Display historical weather data
    function displayHistoricalWeather(data, zipCode) {
        // Hide error message if any
        historicalError.classList.add('hidden');
        
        // Set data source label
        dataSourceLabel.textContent = 'Source: Open-Meteo';
        dataSourceLabel.className = 'data-source-label noaa'; // Keep the same styling class
        
        // Clear previous data
        historicalData.innerHTML = '';
        
        // Sort data by date (most recent first)
        const sortedData = [...data].sort((a, b) => b.date - a.date);
        
        // Log the dates we're displaying
        console.log("Displaying dates:", sortedData.map(d => d.date.toLocaleDateString()));
        
        // Add data to table (most recent entries on top)
        sortedData.forEach(dayData => {
            const row = document.createElement('tr');
            
            // Add a class to forecast rows for special styling
            if (dayData.isForecast) {
                row.classList.add('forecast-row');
            }
            
            const dateCell = document.createElement('td');
            dateCell.textContent = dayData.date.toLocaleDateString();
            row.appendChild(dateCell);
            
            const tempCell = document.createElement('td');
            const tempF = Math.round(dayData.temp);
            const tempC = Math.round(fahrenheitToCelsius(dayData.temp));
            tempCell.textContent = `${tempF}°F (${tempC}°C)`;
            row.appendChild(tempCell);
            
            const conditionCell = document.createElement('td');
            conditionCell.textContent = dayData.condition;
            row.appendChild(conditionCell);
            
            const humidityCell = document.createElement('td');
            humidityCell.textContent = `${Math.round(dayData.humidity)}%`;
            row.appendChild(humidityCell);
            
            const precipitationCell = document.createElement('td');
            precipitationCell.textContent = `${dayData.precipitation?.toFixed(2) || '0.00'} in`;
            row.appendChild(precipitationCell);
            
            const windCell = document.createElement('td');
            windCell.textContent = `${Math.round(dayData.wind)} mph`;
            row.appendChild(windCell);
            
            historicalData.appendChild(row);
        });
        
        // Create and display the temperature chart (chronological for chart)
        createTemperatureChart(data);
    }
    
    // Create chart with selectable metrics
    function createTemperatureChart(data) {
        // Show the graph container
        graphContainer.classList.remove('hidden');
        
        // First, get the data in chronological order (oldest to newest)
        const chronologicalData = [...data].sort((a, b) => a.date - b.date);
        
        // Extract dates and data for all metrics
        const dates = chronologicalData.map(day => day.date.toLocaleDateString());
        const temperatures = chronologicalData.map(day => Math.round(day.temp));
        const humidities = chronologicalData.map(day => Math.round(day.humidity));
        const precipitations = chronologicalData.map(day => day.precipitation ? parseFloat(day.precipitation.toFixed(2)) : 0);
        const windSpeeds = chronologicalData.map(day => Math.round(day.wind));
        
        // Function to update chart when metric changes
        const updateChart = (metric) => {
            let dataset;
            let label;
            let unit;
            let color;
            let yAxisLabel;
            
            switch(metric) {
                case 'humidity':
                    dataset = humidities;
                    label = 'Humidity';
                    unit = '%';
                    color = 'rgba(120, 200, 255, 0.15)';
                    yAxisLabel = 'Humidity (%)';
                    break;
                case 'precipitation':
                    dataset = precipitations;
                    label = 'Precipitation';
                    unit = 'in';
                    color = 'rgba(64, 156, 255, 0.15)';
                    yAxisLabel = 'Precipitation (in)';
                    break;
                case 'wind':
                    dataset = windSpeeds;
                    label = 'Wind Speed';
                    unit = 'mph';
                    color = 'rgba(175, 82, 222, 0.15)';
                    yAxisLabel = 'Wind Speed (mph)';
                    break;
                default: // temperature
                    dataset = temperatures;
                    label = 'Temperature';
                    unit = '°F';
                    color = 'rgba(0, 113, 227, 0.15)';
                    yAxisLabel = 'Temperature (°F)';
            }
            
            // Calculate 7-day moving average for the selected metric
            const movingAvg = calculateMovingAverage(dataset, 7);
            
            // Update chart data
            tempChart.data.datasets[0].data = dataset;
            tempChart.data.datasets[0].label = `Daily ${label} (${unit})`;
            tempChart.data.datasets[0].backgroundColor = color;
            tempChart.data.datasets[1].data = movingAvg;
            tempChart.data.datasets[1].label = `7-Day Average ${label}`;
            
            // Update y-axis title and format
            tempChart.options.scales.y.title.text = yAxisLabel;
            
            // Update y-axis tick format based on the unit
            tempChart.options.scales.y.ticks.callback = function(value) {
                if (unit === '°F' || unit === '°C') {
                    return value + '°';
                } else {
                    return value + (unit ? ` ${unit}` : '');
                }
            };
            
            // Set appropriate min and max values for the y-axis based on the data
            const min = Math.min(...dataset);
            const max = Math.max(...dataset);
            const range = max - min;
            
            // For precipitation, start at 0 and add padding to the top
            if (metric === 'precipitation') {
                tempChart.options.scales.y.min = 0;
                tempChart.options.scales.y.max = max + (range * 0.1);
            } else {
                // For other metrics, add padding to both top and bottom
                tempChart.options.scales.y.min = min - (range * 0.1);
                tempChart.options.scales.y.max = max + (range * 0.1);
            }
            
            // Update the chart
            tempChart.update();
        };
        
        // Add event listener to the metric selector
        const metricSelector = document.getElementById('metric-selector');
        metricSelector.addEventListener('change', (e) => {
            updateChart(e.target.value);
        });
        
        // Calculate 7-day moving average for initial temperature data
        const movingAvgTemps = calculateMovingAverage(temperatures, 7);
        
        // If there's an existing chart, destroy it
        if (tempChart) {
            tempChart.destroy();
        }
        
        // Find the index where forecast data starts
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const forecastStartIndex = chronologicalData.findIndex(day => {
            const dayDate = new Date(day.date);
            dayDate.setHours(0, 0, 0, 0);
            return dayDate > today;
        });
        
        // Create the chart
        tempChart = new Chart(temperatureChart, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Daily Temperature (°F)',
                        data: temperatures,
                        borderColor: '#0071e3', // Apple blue
                        backgroundColor: 'rgba(0, 113, 227, 0.15)', // Transparent Apple blue
                        pointRadius: 2.5,
                        pointHoverRadius: 5,
                        borderWidth: 2,
                        fill: true,
                        tension: 0.3, // Smoother curve like in Apple Weather
                        segment: {
                            borderColor: context => {
                                // Change color for forecast data segment
                                if (context.p1DataIndex >= forecastStartIndex && forecastStartIndex !== -1) {
                                    return '#ff9500';  // Apple orange for forecast
                                }
                                return '#0071e3'; // Apple blue
                            },
                            backgroundColor: context => {
                                // Change fill color for forecast data segment
                                if (context.p1DataIndex >= forecastStartIndex && forecastStartIndex !== -1) {
                                    return 'rgba(255, 149, 0, 0.1)';  // Light Apple orange for forecast
                                }
                                return 'rgba(0, 113, 227, 0.15)'; // Transparent Apple blue
                            }
                        },
                        pointBackgroundColor: context => {
                            // Change point color for forecast days
                            if (context.dataIndex >= forecastStartIndex && forecastStartIndex !== -1) {
                                return '#ff9500';  // Apple orange for forecast
                            }
                            return '#0071e3'; // Apple blue
                        }
                    },
                    {
                        label: '7-Day Average',
                        data: movingAvgTemps,
                        borderColor: '#34c759', // Apple green
                        backgroundColor: 'rgba(52, 199, 89, 0)',
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
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                family: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1d1d1f',
                        bodyColor: '#1d1d1f',
                        borderColor: 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1,
                        cornerRadius: 10,
                        padding: 12,
                        titleFont: {
                            family: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
                            size: 14,
                            weight: '600'
                        },
                        bodyFont: {
                            family: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
                            size: 13
                        },
                        callbacks: {
                            title: function(context) {
                                const dataIndex = context[0].dataIndex;
                                const isForecasted = dataIndex >= forecastStartIndex && forecastStartIndex !== -1;
                                const date = dates[dataIndex];
                                return isForecasted ? `${date} (Forecast)` : date;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxTicksLimit: 8,
                            autoSkip: true,
                            font: {
                                family: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
                                size: 11
                            },
                            color: '#86868b' // Apple secondary text color
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Temperature (°F)'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                family: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
                                size: 11
                            },
                            color: '#86868b',
                            callback: function(value) {
                                return value + '°';
                            }
                        },
                        // Set appropriate min and max values for the y-axis based on the data
                        min: Math.min(...temperatures) - ((Math.max(...temperatures) - Math.min(...temperatures)) * 0.1),
                        max: Math.max(...temperatures) + ((Math.max(...temperatures) - Math.min(...temperatures)) * 0.1)
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
    
    // Function to convert Fahrenheit to Celsius
    function fahrenheitToCelsius(fahrenheit) {
        return (fahrenheit - 32) * 5/9;
    }

    // Open-Meteo weather code to description
    function codeToDescription(code) {
        const codes = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Fog',
            48: 'Depositing rime fog',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            56: 'Light freezing drizzle',
            57: 'Dense freezing drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            66: 'Light freezing rain',
            67: 'Heavy freezing rain',
            71: 'Slight snow fall',
            73: 'Moderate snow fall',
            75: 'Heavy snow fall',
            77: 'Snow grains',
            80: 'Slight rain showers',
            81: 'Moderate rain showers',
            82: 'Violent rain showers',
            85: 'Slight snow showers',
            86: 'Heavy snow showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with slight hail',
            99: 'Thunderstorm with heavy hail'
        };
        return codes[code] || 'Unknown';
    }

    // Get weather icon based on Open-Meteo weather code
    function getWeatherIcon(code) {
        // Map Open-Meteo weather codes to appropriate icons
        // We'll use the Font Awesome icons since they're already included
        let iconUrl;
        
        if (code === 0 || code === 1) {
            // Clear sky or mainly clear - use day or night based on time
            const hour = new Date().getHours();
            iconUrl = hour >= 6 && hour < 20 ? 
                'https://openweathermap.org/img/wn/01d@2x.png' : 
                'https://openweathermap.org/img/wn/01n@2x.png';
        } else if (code === 2) {
            // Partly cloudy
            iconUrl = 'https://openweathermap.org/img/wn/02d@2x.png';
        } else if (code === 3) {
            // Overcast
            iconUrl = 'https://openweathermap.org/img/wn/04d@2x.png';
        } else if (code === 45 || code === 48) {
            // Fog
            iconUrl = 'https://openweathermap.org/img/wn/50d@2x.png';
        } else if ([51, 53, 55, 56, 57].includes(code)) {
            // Drizzle
            iconUrl = 'https://openweathermap.org/img/wn/09d@2x.png';
        } else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
            // Rain
            iconUrl = 'https://openweathermap.org/img/wn/10d@2x.png';
        } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
            // Snow
            iconUrl = 'https://openweathermap.org/img/wn/13d@2x.png';
        } else if ([95, 96, 99].includes(code)) {
            // Thunderstorm
            iconUrl = 'https://openweathermap.org/img/wn/11d@2x.png';
        } else {
            // Default
            iconUrl = 'https://openweathermap.org/img/wn/50d@2x.png';
        }
        
        return iconUrl;
    }
});
