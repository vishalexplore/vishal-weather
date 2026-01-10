const API_KEY = "a935871e11dc6bf3ca8a5d48463cf6dc"
const BASE_URL = "https://api.openweathermap.org/data/2.5"
const GEO_URL = "https://api.openweathermap.org/geo/1.0"

// DOM Elements
const searchInput = document.getElementById("searchInput")
const searchSuggestions = document.getElementById("searchSuggestions")
const micBtn = document.getElementById("micBtn")
const locationBtn = document.getElementById("locationBtn")
const refreshBtn = document.getElementById("refreshBtn")
const settingsBtn = document.getElementById("settingsBtn")
const settingsModal = document.getElementById("settingsModal")
const closeSettings = document.getElementById("closeSettings")
const loading = document.getElementById("loading")
const error = document.getElementById("error")
const errorMessage = document.getElementById("errorMessage")
const weatherContent = document.getElementById("weatherContent")
const weatherBg = document.getElementById("weatherBg")

// Settings
let settings = {
  tempUnit: "metric",
  windUnit: "kmh",
  autoRefresh: true,
}

let currentCity = null
let currentCoords = null
let refreshInterval = null
let tempChart = null
let aqiChart = null
let recognition = null

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadSettings()
  loadLastLocation()
  setupEventListeners()
  createWeatherParticles()
  initSpeechRecognition()
})

function initSpeechRecognition() {
  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onstart = () => {
      micBtn.classList.add("active")
    }

    recognition.onend = () => {
      micBtn.classList.remove("active")
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      searchInput.value = transcript
      searchCity(transcript)
    }

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error)
      micBtn.classList.remove("active")
      if (event.error === "no-speech") {
        showError("No speech detected. Please try again.")
      } else {
        showError("Voice recognition error. Please try again.")
      }
    }
  } else {
    micBtn.style.display = "none"
  }
}

function handleMicClick() {
  if (recognition) {
    if (micBtn.classList.contains("active")) {
      recognition.stop()
    } else {
      recognition.start()
    }
  }
}

// Event Listeners
function setupEventListeners() {
  searchInput.addEventListener("input", handleSearchInput)
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const value = searchInput.value.trim()
      if (value) {
        searchCity(value)
        searchSuggestions.classList.remove("active")
      }
    }
  })

  micBtn.addEventListener("click", handleMicClick)

  locationBtn.addEventListener("click", getCurrentLocation)
  refreshBtn.addEventListener("click", refreshWeatherData)
  settingsBtn.addEventListener("click", () => settingsModal.classList.add("active"))
  closeSettings.addEventListener("click", () => settingsModal.classList.remove("active"))

  document.getElementById("tempUnit").addEventListener("change", (e) => {
    settings.tempUnit = e.target.value
    saveSettings()
    if (currentCoords) {
      fetchWeatherData(currentCoords.lat, currentCoords.lon)
    }
  })

  document.getElementById("windUnit").addEventListener("change", (e) => {
    settings.windUnit = e.target.value
    saveSettings()
  })

  document.getElementById("autoRefresh").addEventListener("change", (e) => {
    settings.autoRefresh = e.target.checked
    saveSettings()
    if (settings.autoRefresh) {
      startAutoRefresh()
    } else {
      stopAutoRefresh()
    }
  })

  // Close modal when clicking outside
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove("active")
    }
  })

  // Close suggestions when clicking outside
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
      searchSuggestions.classList.remove("active")
    }
  })
}

let searchTimeout
async function handleSearchInput(e) {
  const query = e.target.value.trim()

  if (query.length < 2) {
    searchSuggestions.classList.remove("active")
    return
  }

  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    try {
      const response = await fetch(`${GEO_URL}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`)
      const data = await response.json()

      if (data.length > 0) {
        displaySuggestions(data)
      } else {
        searchSuggestions.classList.remove("active")
      }
    } catch (err) {
      console.error("Error fetching suggestions:", err)
    }
  }, 300)
}

function displaySuggestions(cities) {
  searchSuggestions.innerHTML = cities
    .map(
      (city) => `
        <div class="suggestion-item" onclick="selectCity(${city.lat}, ${city.lon}, '${city.name}', '${city.country}')">
            ${city.name}, ${city.state ? city.state + ", " : ""}${city.country}
        </div>
    `,
    )
    .join("")
  searchSuggestions.classList.add("active")
}

function selectCity(lat, lon, name, country) {
  currentCity = { name, country }
  currentCoords = { lat, lon }
  searchSuggestions.classList.remove("active")
  searchInput.value = `${name}, ${country}`
  fetchWeatherData(lat, lon)
  saveLastLocation()
}

async function searchCity(cityName) {
  try {
    const response = await fetch(`${GEO_URL}/direct?q=${encodeURIComponent(cityName)}&limit=1&appid=${API_KEY}`)
    const data = await response.json()

    if (data.length > 0) {
      const city = data[0]
      selectCity(city.lat, city.lon, city.name, city.country)
    } else {
      showError("City not found. Please try again.")
    }
  } catch (err) {
    console.error("Error searching city:", err)
    showError("Error searching for city. Please try again.")
  }
}

function getCurrentLocation() {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser")
    return
  }

  locationBtn.style.opacity = "0.5"
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      currentCoords = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      }

      // Get city name from coordinates
      try {
        const response = await fetch(
          `${GEO_URL}/reverse?lat=${currentCoords.lat}&lon=${currentCoords.lon}&limit=1&appid=${API_KEY}`,
        )
        const data = await response.json()
        if (data.length > 0) {
          currentCity = { name: data[0].name, country: data[0].country }
          searchInput.value = `${currentCity.name}, ${currentCity.country}`
        }
      } catch (err) {
        console.error("Error getting city name:", err)
      }

      fetchWeatherData(currentCoords.lat, currentCoords.lon)
      saveLastLocation()
      locationBtn.style.opacity = "1"
    },
    (err) => {
      console.error("Error getting location:", err)
      showError("Unable to get your location. Please search for a city.")
      locationBtn.style.opacity = "1"
    },
  )
}

async function fetchWeatherData(lat, lon) {
  showLoading()

  try {
    // Fetch current weather
    const currentWeather = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${settings.tempUnit}&appid=${API_KEY}`,
    )
    const currentData = await currentWeather.json()

    // Fetch hourly forecast
    const forecast = await fetch(
      `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${settings.tempUnit}&appid=${API_KEY}`,
    )
    const forecastData = await forecast.json()

    // Fetch air quality
    const airQuality = await fetch(`${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`)
    const airData = await airQuality.json()

    // Fetch UV index (using OneCall API alternative)
    const uvData = await fetchUVIndex(lat, lon)

    displayWeatherData(currentData, forecastData, airData, uvData)
    updateBackground(currentData.weather[0].main)

    if (settings.autoRefresh) {
      startAutoRefresh()
    }
  } catch (err) {
    console.error("Error fetching weather data:", err)
    showError("Unable to fetch weather data. Please try again.")
  }
}

async function fetchUVIndex(lat, lon) {
  // Note: UV Index requires OneCall API which needs a different subscription
  // For demonstration, we'll return a simulated value
  return Math.floor(Math.random() * 11)
}

function displayWeatherData(current, forecast, air, uv) {
  hideLoading()
  hideError()
  weatherContent.style.display = "grid"

  // Current weather
  document.getElementById("cityName").textContent = `${current.name}, ${current.sys.country}`
  document.getElementById("currentDate").textContent = formatDate(new Date())
  document.getElementById("mainWeatherIcon").src = getWeatherIcon(current.weather[0].icon)
  document.getElementById("tempValue").textContent = Math.round(current.main.temp)
  document.getElementById("weatherDescription").textContent = current.weather[0].description
  document.getElementById("feelsLike").textContent = Math.round(current.main.feels_like)
  document.getElementById("humidity").textContent = `${current.main.humidity}%`
  document.getElementById("windSpeed").textContent = convertWindSpeed(current.wind.speed)
  document.getElementById("pressure").textContent = `${current.main.pressure} hPa`
  document.getElementById("visibility").textContent = `${(current.visibility / 1000).toFixed(1)} km`
  document.getElementById("uvIndex").textContent = uv
  document.getElementById("cloudiness").textContent = `${current.clouds.all}%`

  // Sunrise & Sunset
  document.getElementById("sunrise").textContent = formatTime(current.sys.sunrise)
  document.getElementById("sunset").textContent = formatTime(current.sys.sunset)

  displayWeatherStats(current, forecast.list)

  displayTemperatureChart(forecast.list.slice(0, 8))

  // Hourly forecast
  displayHourlyForecast(forecast.list.slice(0, 8))

  // 7-day forecast
  display7DayForecast(forecast.list)

  // Air quality
  displayAirQuality(air.list[0])

  // Update temp unit display
  const tempUnit = settings.tempUnit === "metric" ? "°C" : "°F"
  document.querySelectorAll(".temp-unit").forEach((el) => (el.textContent = tempUnit))
}

function displayWeatherStats(current, forecastList) {
  // Calculate high/low from forecast
  const temps = forecastList.slice(0, 8).map((item) => item.main.temp)
  const high = Math.round(Math.max(...temps))
  const low = Math.round(Math.min(...temps))
  const tempUnit = settings.tempUnit === "metric" ? "°C" : "°F"

  document.getElementById("statHighLow").textContent = `${high}${tempUnit} / ${low}${tempUnit}`

  // Wind direction
  const windDir = getWindDirection(current.wind.deg)
  document.getElementById("statWindDir").textContent = windDir

  // Dew point calculation
  const temp = current.main.temp
  const humidity = current.main.humidity
  const dewPoint = calculateDewPoint(temp, humidity)
  document.getElementById("statDewPoint").textContent = `${Math.round(dewPoint)}${tempUnit}`

  // Precipitation
  const rain = current.rain ? current.rain["1h"] || 0 : 0
  const snow = current.snow ? current.snow["1h"] || 0 : 0
  const precip = rain + snow
  document.getElementById("statPrecip").textContent = precip > 0 ? `${precip.toFixed(1)} mm` : "None"
}

function calculateDewPoint(temp, humidity) {
  const a = 17.27
  const b = 237.7
  const alpha = (a * temp) / (b + temp) + Math.log(humidity / 100)
  return (b * alpha) / (a - alpha)
}

function getWindDirection(degrees) {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ]
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}

function displayTemperatureChart(hourlyData) {
  const canvas = document.getElementById("temperatureChart")
  const ctx = canvas.getContext("2d")

  // Destroy existing chart
  if (tempChart) {
    tempChart = null
  }

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Prepare data
  const labels = hourlyData.map((hour) => {
    const time = new Date(hour.dt * 1000)
    return time.getHours() + ":00"
  })
  const temps = hourlyData.map((hour) => Math.round(hour.main.temp))

  // Draw simple line chart
  drawLineChart(ctx, canvas, labels, temps, "Temperature")
}

function drawLineChart(ctx, canvas, labels, data, label) {
  const width = canvas.width
  const height = canvas.height
  const padding = 40
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  // Clear canvas
  ctx.clearRect(0, 0, width, height)

  // Find min and max
  const maxValue = Math.max(...data)
  const minValue = Math.min(...data)
  const range = maxValue - minValue

  // Draw axes
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(padding, padding)
  ctx.lineTo(padding, height - padding)
  ctx.lineTo(width - padding, height - padding)
  ctx.stroke()

  // Draw grid lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = padding + (chartHeight / 4) * i
    ctx.beginPath()
    ctx.moveTo(padding, y)
    ctx.lineTo(width - padding, y)
    ctx.stroke()
  }

  // Draw line
  ctx.strokeStyle = "#3b82f6"
  ctx.lineWidth = 3
  ctx.beginPath()

  const stepX = chartWidth / (data.length - 1)

  data.forEach((value, index) => {
    const x = padding + stepX * index
    const y = height - padding - ((value - minValue) / range) * chartHeight

    if (index === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  })

  ctx.stroke()

  // Draw points
  ctx.fillStyle = "#3b82f6"
  data.forEach((value, index) => {
    const x = padding + stepX * index
    const y = height - padding - ((value - minValue) / range) * chartHeight

    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
  })

  // Draw labels
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'
  ctx.textAlign = "center"

  labels.forEach((label, index) => {
    const x = padding + stepX * index
    ctx.fillText(label, x, height - padding + 20)
  })

  // Draw values
  data.forEach((value, index) => {
    const x = padding + stepX * index
    const y = height - padding - ((value - minValue) / range) * chartHeight
    ctx.fillText(value + "°", x, y - 10)
  })
}

function displayAirQuality(airData) {
  const aqi = airData.main.aqi
  const aqiLabels = ["Good", "Fair", "Moderate", "Poor", "Very Poor"]
  const aqiClasses = ["good", "fair", "moderate", "poor", "very-poor"]
  const aqiDescriptions = [
    "Air quality is excellent. Perfect day for outdoor activities!",
    "Air quality is acceptable. Most people can enjoy outdoor activities.",
    "Air quality is moderate. Sensitive individuals should limit prolonged outdoor activities.",
    "Air quality is poor. Everyone should reduce prolonged outdoor activities.",
    "Air quality is very poor. Everyone should avoid outdoor activities.",
  ]

  const aqiCircle = document.getElementById("aqiCircle")
  aqiCircle.className = "aqi-circle " + aqiClasses[aqi - 1]

  document.getElementById("aqiValue").textContent = aqi
  document.getElementById("aqiLabel").textContent = aqiLabels[aqi - 1]
  document.getElementById("aqiDetailText").textContent = aqiDescriptions[aqi - 1]

  const components = airData.components
  const componentsHTML = `
        <div class="aqi-component">
            <div class="aqi-component-name">CO</div>
            <div class="aqi-component-value">${components.co.toFixed(1)}</div>
            <span class="aqi-component-unit">μg/m³</span>
        </div>
        <div class="aqi-component">
            <div class="aqi-component-name">NO₂</div>
            <div class="aqi-component-value">${components.no2.toFixed(1)}</div>
            <span class="aqi-component-unit">μg/m³</span>
        </div>
        <div class="aqi-component">
            <div class="aqi-component-name">O₃</div>
            <div class="aqi-component-value">${components.o3.toFixed(1)}</div>
            <span class="aqi-component-unit">μg/m³</span>
        </div>
        <div class="aqi-component">
            <div class="aqi-component-name">PM2.5</div>
            <div class="aqi-component-value">${components.pm2_5.toFixed(1)}</div>
            <span class="aqi-component-unit">μg/m³</span>
        </div>
        <div class="aqi-component">
            <div class="aqi-component-name">PM10</div>
            <div class="aqi-component-value">${components.pm10.toFixed(1)}</div>
            <span class="aqi-component-unit">μg/m³</span>
        </div>
        <div class="aqi-component">
            <div class="aqi-component-name">SO₂</div>
            <div class="aqi-component-value">${components.so2.toFixed(1)}</div>
            <span class="aqi-component-unit">μg/m³</span>
        </div>
    `
  document.getElementById("aqiComponents").innerHTML = componentsHTML

  displayAqiChart(components)
}

function displayAqiChart(components) {
  const canvas = document.getElementById("aqiChart")
  const ctx = canvas.getContext("2d")

  // Destroy existing chart
  if (aqiChart) {
    aqiChart = null
  }

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const pollutants = ["CO", "NO₂", "O₃", "PM2.5", "PM10", "SO₂"]
  const values = [
    components.co / 100, // Scale down CO
    components.no2,
    components.o3,
    components.pm2_5,
    components.pm10,
    components.so2,
  ]

  // Normalize values to 0-100 scale
  const maxVal = Math.max(...values)
  const normalizedValues = values.map((v) => (v / maxVal) * 100)

  drawBarChart(ctx, canvas, pollutants, normalizedValues)
}

function drawBarChart(ctx, canvas, labels, data) {
  const width = canvas.width
  const height = canvas.height
  const padding = 40
  const chartHeight = height - padding * 2
  const barWidth = (width - padding * 2) / data.length - 10

  // Clear canvas
  ctx.clearRect(0, 0, width, height)

  // Draw bars
  data.forEach((value, index) => {
    const x = padding + (barWidth + 10) * index
    const barHeight = (value / 100) * chartHeight
    const y = height - padding - barHeight

    // Draw bar
    const gradient = ctx.createLinearGradient(x, y, x, height - padding)
    gradient.addColorStop(0, "#3b82f6")
    gradient.addColorStop(1, "#1e40af")

    ctx.fillStyle = gradient
    ctx.fillRect(x, y, barWidth, barHeight)

    // Draw label
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto'
    ctx.textAlign = "center"
    ctx.fillText(labels[index], x + barWidth / 2, height - padding + 20)

    // Draw value
    ctx.fillText(Math.round(value) + "%", x + barWidth / 2, y - 5)
  })
}

function displayHourlyForecast(hourlyData) {
  const hourlyContainer = document.getElementById("hourlyForecast")
  hourlyContainer.innerHTML = hourlyData
    .map((hour) => {
      const time = new Date(hour.dt * 1000)
      return `
            <div class="hourly-item">
                <div class="hourly-time">${time.getHours()}:00</div>
                <div class="hourly-icon">
                    <img src="${getWeatherIcon(hour.weather[0].icon)}" alt="Weather icon for ${hour.weather[0].description}">
                </div>
                <div class="hourly-temp">${Math.round(hour.main.temp)}°</div>
                <div class="hourly-desc">${hour.weather[0].main}</div>
            </div>
        `
    })
    .join("")
}

function display7DayForecast(forecastList) {
  const dailyData = {}

  forecastList.forEach((item) => {
    const date = new Date(item.dt * 1000)
    const day = date.toDateString()

    if (!dailyData[day]) {
      dailyData[day] = {
        temps: [],
        weather: item.weather[0],
        date: date,
      }
    }
    dailyData[day].temps.push(item.main.temp)
  })

  const days = Object.values(dailyData).slice(0, 7)
  const forecastContainer = document.getElementById("forecastList")

  forecastContainer.innerHTML = days
    .map((day, index) => {
      const maxTemp = Math.round(Math.max(...day.temps))
      const minTemp = Math.round(Math.min(...day.temps))
      const dayName = index === 0 ? "Today" : day.date.toLocaleDateString("en-US", { weekday: "short" })

      return `
            <div class="forecast-item">
                <div class="forecast-day">${dayName}</div>
                <div class="forecast-icon">
                    <img src="${getWeatherIcon(day.weather.icon)}" alt="Weather icon for ${day.weather.description}">
                </div>
                <div class="forecast-desc">${day.weather.description}</div>
                <div class="forecast-temp">
                    <span class="forecast-temp-max">${maxTemp}°</span>
                    <span class="forecast-temp-min">${minTemp}°</span>
                </div>
            </div>
        `
    })
    .join("")
}

function updateBackground(weatherMain) {
  const weatherBg = document.getElementById("weatherBg")
  const particles = document.getElementById("weatherParticles")

  // Clear existing particles
  particles.innerHTML = ""

  // Remove existing weather classes
  weatherBg.className = "weather-bg"

  // Add appropriate weather class and particles
  switch (weatherMain.toLowerCase()) {
    case "clear":
      weatherBg.style.background = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)"
      break
    case "clouds":
      weatherBg.style.background = "linear-gradient(135deg, #475569 0%, #64748b 100%)"
      break
    case "rain":
    case "drizzle":
      weatherBg.style.background = "linear-gradient(135deg, #1e293b 0%, #334155 100%)"
      createRainEffect()
      break
    case "snow":
      weatherBg.style.background = "linear-gradient(135deg, #cbd5e1 0%, #f1f5f9 100%)"
      createSnowEffect()
      break
    case "thunderstorm":
      weatherBg.style.background = "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
      break
    default:
      weatherBg.style.background = "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
  }
}

function createWeatherParticles() {
  // Initial particles
}

function createRainEffect() {
  const particles = document.getElementById("weatherParticles")
  for (let i = 0; i < 100; i++) {
    const rain = document.createElement("div")
    rain.style.position = "absolute"
    rain.style.width = "2px"
    rain.style.height = "20px"
    rain.style.background = "rgba(255, 255, 255, 0.3)"
    rain.style.left = Math.random() * 100 + "%"
    rain.style.top = Math.random() * -100 + "%"
    rain.style.animation = `fall ${Math.random() * 2 + 1}s linear infinite`
    rain.style.animationDelay = Math.random() * 2 + "s"
    particles.appendChild(rain)
  }

  // Add fall animation
  if (!document.getElementById("fallAnimation")) {
    const style = document.createElement("style")
    style.id = "fallAnimation"
    style.textContent = `
            @keyframes fall {
                to {
                    transform: translateY(100vh);
                }
            }
        `
    document.head.appendChild(style)
  }
}

function createSnowEffect() {
  const particles = document.getElementById("weatherParticles")
  for (let i = 0; i < 50; i++) {
    const snow = document.createElement("div")
    snow.style.position = "absolute"
    snow.style.width = "8px"
    snow.style.height = "8px"
    snow.style.background = "white"
    snow.style.borderRadius = "50%"
    snow.style.left = Math.random() * 100 + "%"
    snow.style.top = Math.random() * -100 + "%"
    snow.style.animation = `fall ${Math.random() * 3 + 2}s linear infinite`
    snow.style.animationDelay = Math.random() * 3 + "s"
    snow.style.opacity = Math.random() * 0.6 + 0.4
    particles.appendChild(snow)
  }
}

function getWeatherIcon(iconCode) {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function formatTime(timestamp) {
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

function convertWindSpeed(speed) {
  // speed is in m/s for metric
  switch (settings.windUnit) {
    case "kmh":
      return `${(speed * 3.6).toFixed(1)} km/h`
    case "mph":
      return `${(speed * 2.237).toFixed(1)} mph`
    case "ms":
      return `${speed.toFixed(1)} m/s`
    default:
      return `${(speed * 3.6).toFixed(1)} km/h`
  }
}

function showLoading() {
  loading.style.display = "block"
  error.style.display = "none"
  weatherContent.style.display = "none"
}

function hideLoading() {
  loading.style.display = "none"
}

function showError(message) {
  error.style.display = "block"
  errorMessage.textContent = message
  loading.style.display = "none"
  weatherContent.style.display = "none"
}

function hideError() {
  error.style.display = "none"
}

function refreshWeatherData() {
  refreshBtn.style.animation = "spin 1s linear"
  setTimeout(() => {
    refreshBtn.style.animation = ""
  }, 1000)

  if (currentCoords) {
    fetchWeatherData(currentCoords.lat, currentCoords.lon)
  }
}

function startAutoRefresh() {
  stopAutoRefresh()
  refreshInterval = setInterval(() => {
    if (currentCoords) {
      fetchWeatherData(currentCoords.lat, currentCoords.lon)
    }
  }, 600000) // 10 minutes
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

function loadSettings() {
  const saved = localStorage.getItem("weatherAppSettings")
  if (saved) {
    settings = { ...settings, ...JSON.parse(saved) }
    document.getElementById("tempUnit").value = settings.tempUnit
    document.getElementById("windUnit").value = settings.windUnit
    document.getElementById("autoRefresh").checked = settings.autoRefresh
  }
}

function saveSettings() {
  localStorage.setItem("weatherAppSettings", JSON.stringify(settings))
}

function saveLastLocation() {
  if (currentCoords && currentCity) {
    localStorage.setItem(
      "lastLocation",
      JSON.stringify({
        coords: currentCoords,
        city: currentCity,
      }),
    )
  }
}

function loadLastLocation() {
  const saved = localStorage.getItem("lastLocation")
  if (saved) {
    const { coords, city } = JSON.parse(saved)
    currentCoords = coords
    currentCity = city
    searchInput.value = `${city.name}, ${city.country}`
    fetchWeatherData(coords.lat, coords.lon)
  } else {
    getCurrentLocation()
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => console.log("SW registered:", registration))
      .catch((error) => console.log("SW registration failed:", error))
  })
}
