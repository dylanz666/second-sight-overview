// Set current year
document.getElementById('current-year').textContent = new Date().getFullYear();

// Get gist device data
async function getDevicesFromGist() {
    // Decode Base64 string
    const decodedStr = atob(window.gistToken);
    // Convert UTF-8 encoding back to string
    const token = decodeURIComponent(escape(decodedStr));
    const response = await fetch(window.gistUrl, {
        headers: {
            'Authorization': token
        }
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    const devicesJson = data.files['devices.json'];
    if (!devicesJson || !devicesJson.content) throw new Error('No valid device data found');
    return JSON.parse(devicesJson.content);
}

// Render device card
function renderDeviceCard(deviceId, deviceInfo, isOnline) {
    const ipAddress = typeof deviceInfo === "object" ? deviceInfo.ip : deviceInfo;
    const statusClass = isOnline ? 'bg-success' : 'bg-error';
    const statusText = isOnline ? 'Online' : 'Offline';
    const statusIcon = isOnline ? 'fa-check-circle' : 'fa-times-circle';
    const pulseClass = isOnline ? 'pulse-animation' : '';

    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg overflow-hidden card-shadow fade-in';
    card.innerHTML = `
        <div class="p-5">
            <div class="flex justify-between items-start mb-3">
                <h3 class="font-semibold text-lg">${deviceId}</h3>
                <span class="flex items-center ${statusClass} text-white text-xs px-2 py-1 rounded-full ${pulseClass}">
                    <i class="fa ${statusIcon} mr-1"></i> ${statusText}
                </span>
            </div>
            <div class="flex items-center text-gray-600 mb-4">
                <i class="fa fa-globe mr-2 text-primary"></i>
                <span>${ipAddress}</span>
            </div>
            <div class="flex justify-end space-x-2">
                <button class="test-connection-btn bg-base-200 hover:bg-base-300 text-gray-700 px-3 py-1.5 rounded-md text-sm transition-colors" data-device="${deviceId}">
                    <i class="fa fa-ping mr-1"></i> Test Connection
                </button>
                <a href="http://${ipAddress}:8000" target="_blank" rel="noopener noreferrer" class="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-md text-sm transition-colors flex items-center">
                    <i class="fa fa-cog mr-1"></i> Control
                </a>
            </div>
        </div>
    `;
    return card;
}

// Update card status
function updateCardStatus(card, ok) {
    const statusSpan = card.querySelector('span.flex.items-center');
    if (statusSpan) {
        statusSpan.classList.remove('bg-success', 'bg-error', 'pulse-animation');
        while (statusSpan.firstChild) statusSpan.removeChild(statusSpan.firstChild);
        const icon = document.createElement('i');
        icon.classList.add('fa', 'mr-1');
        if (ok) {
            statusSpan.classList.add('bg-success', 'pulse-animation');
            icon.classList.add('fa-check-circle');
            statusSpan.appendChild(icon);
            statusSpan.append(' Online');
        } else {
            statusSpan.classList.add('bg-error');
            icon.classList.add('fa-times-circle');
            statusSpan.appendChild(icon);
            statusSpan.append(' Offline');
        }
    }
}

function getTimestamp() {
    return Math.floor(Date.now() / 1000);
}

// Main function
async function fetchAndDisplayServices() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const servicesContainer = document.getElementById('services-container');
    const errorMessage = document.getElementById('error-message');

    loading.classList.remove('hidden');
    error.classList.add('hidden');
    servicesContainer.classList.add('hidden');
    servicesContainer.innerHTML = '';

    try {
        // Get local timestamp
        const currentTimestamp = getTimestamp();
        const devices = await getDevicesFromGist();
        const deviceIds = Object.keys(devices);

        document.getElementById('total-services').textContent = deviceIds.length;

        let onlineCount = 0;
        deviceIds.forEach(deviceId => {
            const deviceInfo = devices[deviceId];
            const lastTimestamp = typeof deviceInfo === "object" ? deviceInfo.timestamp : 0;
            // left 10 seconds for network delay
            const isOnline = lastTimestamp > -1 && currentTimestamp - lastTimestamp <= 130;
            if (isOnline) onlineCount++;
            const card = renderDeviceCard(deviceId, deviceInfo, isOnline);
            servicesContainer.appendChild(card);
        });

        document.getElementById('online-services').textContent = onlineCount;
        document.getElementById('offline-services').textContent = deviceIds.length - onlineCount;

        // Bind "Test Connection" button event
        servicesContainer.querySelectorAll('.test-connection-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.replaceWith(newBtn);
            newBtn.addEventListener('click', async function () {
                newBtn.disabled = true;
                newBtn.textContent = 'Testing...';
                let ok = false, result = '';
                try {
                    const [currentTimestamp2, devices2] = await Promise.all([
                        getTimestamp(),
                        getDevicesFromGist()
                    ]);
                    const deviceId = newBtn.getAttribute('data-device');
                    const deviceInfo2 = devices2[deviceId];
                    const lastTimestamp2 = typeof deviceInfo2 === "object" ? deviceInfo2.timestamp : 0;
                    ok = currentTimestamp2 - lastTimestamp2 <= 130 && currentTimestamp2 > -1 && lastTimestamp2 > -1;
                    result = ok
                        ? `Device ${deviceId} online (2 min cache)`
                        : `Device ${deviceId} offline (2 min cache)`;
                } catch {
                    result = `Device status unknown`;
                }
                updateCardStatus(newBtn.closest('.card-shadow'), ok);
                alert(result);
                newBtn.disabled = false;
                newBtn.innerHTML = '<i class="fa fa-ping mr-1"></i> Test Connection';
            });
        });

        document.getElementById('last-updated').textContent = `Last updated: ${new Date().toLocaleString()}`;
        loading.classList.add('hidden');
        servicesContainer.classList.remove('hidden');
    } catch (err) {
        console.error('Failed to get service data:', err);
        if (errorMessage) errorMessage.textContent = `Error: ${err.message}`;
        loading.classList.add('hidden');
        error.classList.remove('hidden');
    }
}

// Fetch data on page load
window.addEventListener('DOMContentLoaded', fetchAndDisplayServices);

// Refresh button click event
document.getElementById('refresh-btn').addEventListener('click', fetchAndDisplayServices);
