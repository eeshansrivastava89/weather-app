# Weather App

A web application that displays current and historical weather information for US zip codes.

## Features

* Current weather data by zip code (temperature, conditions, humidity, wind)
* Historical weather data for the past 90 days
* Interactive temperature trend chart
* Data sourced from official NOAA weather stations
* Responsive design for mobile and desktop

## Technologies Used

* HTML5, CSS3, JavaScript
* OpenWeatherMap API (current weather)
* NOAA Climate Data Online API (historical data)
* Chart.js (visualization)

## Setup Instructions

1. Clone this repository
2. Open `index.html` in a web browser
3. Start searching for weather by zip code

Note: API keys for OpenWeatherMap and NOAA are included for demonstration purposes.

## Deployment

This application is deployed using GitHub Pages at: https://[YOUR-USERNAME].github.io/weather-app/

To deploy your own instance:
1. Fork this repository
2. Go to Settings > Pages
3. Select "Deploy from a branch" (main branch, root folder)
4. Access at https://[YOUR-USERNAME].github.io/weather-app/

## How to Use

1. Enter a 5-digit US zip code
2. View current weather information
3. Scroll down for historical data and temperature trends

## Data Sources

### Current Weather
* OpenWeatherMap API provides real-time weather data

### Historical Weather
* NOAA Climate Data Online API
* Displays 90 days of historical data from nearest weather station
* Includes temperature, weather conditions, humidity, and wind
* Interactive chart with 7-day moving average

## Application Structure

* **index.html**: Main structure and UI
* **style.css**: Styling and responsive design
* **script.js**: Core functionality and OpenWeatherMap integration
* **noaa-api.js**: NOAA API integration for historical data

## Troubleshooting

* API limits: OpenWeatherMap (60 calls/minute), NOAA (1,000 requests/day)
* Remote locations may have limited historical data
* Check browser console (F12) for detailed error messages

## Future Improvements

* Weather forecast for upcoming days
* Geolocation for automatic user location detection
* Toggle between imperial/metric units
* Dark/light mode