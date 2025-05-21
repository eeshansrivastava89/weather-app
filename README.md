# Weather App

A simple web application that displays current weather information for a given US zip code.

## Features

*   Look up weather by zip code
*   Display of current temperature, feels like temperature, and weather conditions
*   Display of humidity and wind speed
*   Historical weather data for the past 90 days
*   Interactive temperature trend chart showing 90-day history
*   Clear labeling of data sources (NOAA Official or Simulated)
*   Responsive design that works on both mobile and desktop

## Technologies Used

*   HTML5
*   CSS3
*   JavaScript (Vanilla)
*   OpenWeatherMap API (for current weather data)
*   NOAA Climate Data Online API (for historical weather data)
*   Chart.js (for temperature trend visualization)

## Setup Instructions

1.  Clone this repository
2.  Sign up for a free API key at [OpenWeatherMap](https://openweathermap.org/api)
3.  Open `script.js` and replace `openWeatherApiKey` value with your actual API key
4.  For historical weather data, get a free API token from [NOAA CDO](https://www.ncdc.noaa.gov/cdo-web/token)
5.  In `script.js`, replace `noaaApiToken` value with your actual NOAA token
6.  Open `index.html` in a web browser

## How to Use

1.  Enter a valid 5-digit US zip code in the input field
2.  Click the "Search" button or press Enter
3.  View the current weather information for the specified location
4.  Scroll down to see the historical weather data for the past 90 days

## Historical Weather Data

The application displays a table of historical weather data for the past 90 days for each zip code searched. The historical data includes:

*   Date
*   Temperature
*   Weather condition
*   Humidity
*   Wind speed

A label at the top of the table clearly indicates whether the data comes from "NOAA Official Data" or "Simulated Data" so users always know the source of the information they're viewing.

### Temperature Trend Chart

Below the historical data table, the application displays an interactive temperature chart showing:

*   Daily temperature data for the past 90 days
*   A 7-day moving average trend line to smooth out daily fluctuations
*   Interactive tooltips showing exact temperatures when hovering
*   The chart is responsive and will adapt to different screen sizes

The temperature chart provides visual insights into seasonal patterns and temperature trends that might not be immediately obvious from the tabular data alone.

### Data Sources

This app uses two sources for historical weather data:

**NOAA Climate Data Online (CDO) API** - Primary source that provides real historical weather data

*   Free to use with API token registration
*   Provides actual recorded data from weather stations across the US
*   Data includes temperature, precipitation, snow, and wind measurements
*   The app automatically finds the nearest weather station to the requested location

**Simulated Data + OpenWeatherMap Forecast** - Fallback mechanism

*   Used when NOAA data is unavailable or when no NOAA token is provided
*   Combines actual 5-day forecast from OpenWeatherMap with simulated data
*   Simulated data uses seasonal adjustments and random variations for realism

### Using NOAA's Historical Weather Data

To get the most accurate historical weather information:

**Register for a free NOAA API token:**

*   Visit: https://www.ncdc.noaa.gov/cdo-web/token
*   You'll receive an email with your token immediately

**Add your token to the application:**

*   Open `script.js`
*   Find: `const noaaApiToken = 'YOUR_NOAA_TOKEN';`
*   Replace with your actual token from NOAA

**How the NOAA integration works:**

*   App finds the nearest weather station to the zip code's coordinates
*   Retrieves 90 days of historical data from that station
*   Processes NOAA's data format (converting units as needed)
*   Displays the processed data in the table
*   Falls back to simulated data if any step fails

**Data processing:**

*   Temperature: Converted from tenths of Celsius to Fahrenheit
*   Wind: Converted from meters/second to mph
*   Weather conditions: Derived from precipitation and snow data
*   All data is cached to minimize API calls

## Screenshots

(Add screenshots here once the application is running)

## Notes

*   The free tier of the OpenWeatherMap API has a limit of 60 calls per minute
*   This application is for educational purposes only

## Troubleshooting

If you encounter issues with the historical weather data:

**NOAA API Token Issues**:

*   Make sure your NOAA API token is correctly entered in `script.js`
*   NOAA tokens are typically activated immediately but may take up to 24 hours in some cases
*   The NOAA API has a limit of 1,000 requests per day
*   Check for any error messages displayed under the historical data table

**No Historical Data Available**:

*   Some remote locations may not have nearby weather stations
*   The app will automatically fall back to simulated data if NOAA data is unavailable
*   Check the console (F12 in most browsers) for detailed error messages
*   Try a different zip code for a more populated area

**OpenWeatherMap Issues**:

*   If the current weather fails to load, check that your OpenWeatherMap API key is valid
*   New OpenWeatherMap API keys may take a few hours to activate
*   Check your browser's developer console for API error messages

## Future Improvements

*   Add forecast data for upcoming days
*   Add geolocation to automatically detect user's location
*   Add ability to switch between imperial and metric units
*   Add dark/light mode toggle

## Application Structure

The application consists of the following files:

*   **index.html**: The main HTML file containing the structure of the weather app
*   **style.css**: CSS file for styling the application
*   **script.js**: Main JavaScript file that handles:
    *   User interface interactions
    *   Weather data fetching from OpenWeatherMap
    *   Displaying current weather
    *   Coordinating historical data fetching
    *   Fallback to simulated data when needed
*   **noaa-api.js**: JavaScript module dedicated to NOAA API integration:
    *   Functions for finding the nearest weather station
    *   Fetching historical data from NOAA CDO API
    *   Processing and converting NOAA data formats
    *   Converting between different units of measurement

## Notes on the NOAA Integration

*   NOAA's Climate Data Online (CDO) API provides access to historical weather records from thousands of weather stations
*   The application first searches for stations near the requested coordinates using the `extent` parameter
*   It prioritizes stations with the best data coverage using NOAA's `sortfield` parameter
*   The data is fetched from the Global Historical Climatology Network Daily (GHCND) dataset
*   We request specific data types: TMAX (max temperature), PRCP (precipitation), SNOW (snowfall), and AWND (average wind)
*   The application handles unit conversions:
    *   Temperature from tenths of Celsius to Fahrenheit
    *   Wind speed from meters/second to mph
    *   Precipitation from tenths of mm to mm
*   If NOAA data is unavailable, the app seamlessly falls back to combined forecast + simulated data