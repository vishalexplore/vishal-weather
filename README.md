# WeatherPro - Advanced Weather Application

A fully-featured, modern weather application with beautiful animations and comprehensive weather data.

## Features

### 🌤️ Current Weather
- Real-time temperature display
- Feels-like temperature
- Weather condition with animated icon
- Humidity, wind speed, pressure
- Visibility and cloudiness
- UV index

### 📅 Forecasts
- **Hourly Forecast**: Next 24 hours with detailed info
- **7-Day Forecast**: Week-ahead weather planning
- Temperature highs and lows
- Weather conditions for each period

### 🌍 Location Features
- Search any city worldwide
- Auto-complete suggestions
- Current location detection (GPS)
- Save last searched location

### 🌬️ Air Quality Index
- Real-time AQI monitoring
- Detailed pollutant breakdown (CO, NO₂, O₃, PM2.5, PM10, SO₂)
- Color-coded quality levels

### 🌅 Sun & Moon
- Sunrise and sunset times
- Moonrise and moonset (when available)

### ⚙️ Settings
- Temperature units (Celsius/Fahrenheit)
- Wind speed units (km/h, mph, m/s)
- Auto-refresh option (every 10 minutes)
- Persistent user preferences

### 🎨 Design Features
- Animated weather backgrounds
- Rain and snow particle effects
- Smooth transitions and hover effects
- Fully responsive design (mobile, tablet, desktop)
- Dark theme optimized for readability
- Glassmorphism UI design

### 📱 PWA Features
- Installable as app on mobile/desktop
- Offline support with service worker
- App shortcuts for quick access
- Custom splash screens

## API Usage

This app uses the OpenWeatherMap API with your provided key:
- Current Weather Data API
- 5 Day / 3 Hour Forecast API
- Air Pollution API
- Geocoding API

## Installation

1. Download all files to a directory
2. Open `index.html` in a modern web browser
3. For PWA features, serve via HTTPS (required for service workers)

### Local Server Options:
```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server -p 8000

# PHP
php -S localhost:8000
```

Then visit: `http://localhost:8000`

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Credits

- Weather data: OpenWeatherMap API
- Icons: OpenWeatherMap weather icons
- Design: Custom glassmorphism UI

## License

Free to use for personal and commercial projects.
