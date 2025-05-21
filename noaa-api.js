// NOAA Weather Data API Functions

// Function to fetch the nearest weather station for given coordinates
function fetchNearestStation(lat, lon, startDate, endDate, noaaApiToken) {
    // Construct the API URL for finding stations
    const stationsUrl = new URL('https://www.ncdc.noaa.gov/cdo-web/api/v2/stations');
    
    // Set the query parameters
    stationsUrl.searchParams.append('extent', `${lat-1},${lon-1},${lat+1},${lon+1}`); // Search within 1 degree
    stationsUrl.searchParams.append('startdate', startDate);
    stationsUrl.searchParams.append('enddate', endDate);
    stationsUrl.searchParams.append('datasetid', 'GHCND'); // Global Historical Climatology Network Daily
    stationsUrl.searchParams.append('limit', '1'); // Just get the nearest one
    stationsUrl.searchParams.append('sortfield', 'datacoverage'); // Sort by data coverage
    stationsUrl.searchParams.append('sortorder', 'desc'); // Highest coverage first
    
    // Make the request
    return fetch(stationsUrl, {
        headers: {
            'token': noaaApiToken
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to fetch stations: ${response.status} ${response.statusText}`);
        }
        return response.json();
    });
}

// Function to fetch data from a specific station
function fetchStationData(stationId, startDate, endDate, noaaApiToken) {
    // Construct the API URL for data
    const dataUrl = new URL('https://www.ncdc.noaa.gov/cdo-web/api/v2/data');
    
    // Set the query parameters
    dataUrl.searchParams.append('datasetid', 'GHCND'); // Global Historical Climatology Network Daily
    dataUrl.searchParams.append('stationid', stationId);
    dataUrl.searchParams.append('startdate', startDate);
    dataUrl.searchParams.append('enddate', endDate);
    dataUrl.searchParams.append('limit', '1000'); // Get as much data as possible
    dataUrl.searchParams.append('datatypeid', 'TMAX,TMIN,PRCP,SNOW,AWND'); // Temperature, precipitation, snow, wind
    
    // Make the request
    return fetch(dataUrl, {
        headers: {
            'token': noaaApiToken
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        return response.json();
    });
}

// Process NOAA data into our format
function processNoaaData(noaaResults) {
    // Group data by date
    const groupedByDate = {};
    
    // Process each data point
    noaaResults.forEach(item => {
        const date = item.date.split('T')[0]; // Get just the date part
        
        if (!groupedByDate[date]) {
            groupedByDate[date] = {
                date: new Date(date),
                temp: null,
                condition: '',
                humidity: null,
                wind: null,
                precipitation: null,
                snow: null
            };
        }
        
        // Process different data types
        switch (item.datatype) {
            case 'TMAX': // Maximum temperature in tenths of Celsius
                // Convert from tenths of Celsius to Fahrenheit
                groupedByDate[date].temp = (item.value / 10) * 9/5 + 32;
                break;
            case 'PRCP': // Precipitation in tenths of mm
                groupedByDate[date].precipitation = item.value / 10;
                break;
            case 'SNOW': // Snowfall in mm
                groupedByDate[date].snow = item.value;
                break;
            case 'AWND': // Average wind speed in meters/sec
                // Convert to mph
                groupedByDate[date].wind = item.value * 2.237;
                break;
        }
    });
    
    // Convert the grouped data into an array and determine conditions
    const processedData = Object.values(groupedByDate)
        .filter(item => item.temp !== null) // Only include days with temperature data
        .map(item => {
            // Determine condition based on precipitation and snow
            if (item.snow > 0) {
                item.condition = 'snow';
            } else if (item.precipitation > 5) {
                item.condition = 'heavy rain';
            } else if (item.precipitation > 1) {
                item.condition = 'light rain';
            } else {
                item.condition = 'clear sky'; // Default if no precipitation data
            }
            
            // Set default humidity if missing
            if (item.humidity === null) {
                item.humidity = 50; // Default value
            }
            
            // Set default wind if missing
            if (item.wind === null) {
                item.wind = 5; // Default value in mph
            }
            
            return {
                date: item.date,
                temp: item.temp,
                condition: item.condition,
                humidity: item.humidity,
                wind: item.wind
            };
        });
    
    // Sort by date (newest first)
    processedData.sort((a, b) => b.date - a.date);
    
    return processedData;
}
