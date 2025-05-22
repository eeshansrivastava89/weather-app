# Weather App

A simple web application that displays current weather information for a given US zip code.

## Features

*   Look up weather by zip code
*   Display of current temperature, feels like temperature, and weather conditions
*   Display of humidity and wind speed
*   Historical weather data for the past 90 days
*   Interactive temperature trend chart showing 90-day history
*   Data directly from NOAA's official weather stations
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
2.  Open `index.html` in a web browser
3.  Start searching for weather by zip code

Note: This version includes hardcoded API keys for both OpenWeatherMap and NOAA APIs for demonstration purposes. In a real application, you would need to register for your own API keys.

## Deployment

This application is deployed using GitHub Pages. You can access the live version at: https://\[YOUR-USERNAME\].github.io/weather-app/

### Deploying Your Own Instance

To deploy your own instance of this application using GitHub Pages:

1.  Fork this repository or create your own copy
2.  Go to the repository Settings on GitHub
3.  Navigate to the "Pages" section under "Code and automation"
4.  Under "Source", select "Deploy from a branch"
5.  Select the "main" branch and "/(root)" folder, then click "Save"
6.  Wait a few minutes for GitHub to build and deploy your site
7.  Access your deployed application at https://\[YOUR-USERNAME\].github.io/weather-app/

The application has API keys included for demonstration purposes.

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

The data is sourced from NOAA's official weather stations, providing reliable historical weather information.

### Temperature Trend Chart

Below the historical data table, the application displays an interactive temperature chart showing:

*   Daily temperature data for the past 90 days
*   A 7-day moving average trend line to smooth out daily fluctuations
*   Interactive tooltips showing exact temperatures when hovering
*   The chart is responsive and will adapt to different screen sizes

The temperature chart provides visual insights into seasonal patterns and temperature trends that might not be immediately obvious from the tabular data alone.

### Data Sources

This app uses NOAA Climate Data Online (CDO) API for historical weather data:

*   Free to use with API token registration
*   Provides actual recorded data from weather stations across the US
*   Data includes temperature, precipitation, snow, and wind measurements
*   The app automatically finds the nearest weather station to the requested location

### Using NOAA's Historical Weather Data

The application is already configured to use NOAA's historical weather data with an included API token. Here's how the integration works:

*   App finds the nearest weather station to the zip code's coordinates
*   Retrieves 90 days of historical data from that station
*   Processes NOAA's data format (converting units as needed)
*   Displays the processed data in the table

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