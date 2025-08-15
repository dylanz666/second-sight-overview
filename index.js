const gist_url = 'https://api.github.com/gists/f04b26ce2b1b0685526b1e08282f469c';
const network_time_url = 'https://dylanz666.github.io';

// 设置当前年份
document.getElementById('current-year').textContent = new Date().getFullYear();

// 获取网络时间戳（如失败则用本地时间）
async function getNetworkTimestamp() {
    try {
        const resp = await fetch(network_time_url, { method: "HEAD" });
        const dateStr = resp.headers.get("date");
        return Math.floor(new Date(dateStr).getTime() / 1000);
    } catch {
        return Math.floor(Date.now() / 1000);
    }
}

// 获取 gist 设备数据
async function getDevicesFromGist() {
    const response = await fetch(gist_url);
    if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
    const data = await response.json();
    const devicesJson = data.files['devices.json'];
    if (!devicesJson || !devicesJson.content) throw new Error('未找到有效的设备数据');
    return JSON.parse(devicesJson.content);
}

// 渲染服务卡片
function renderDeviceCard(deviceId, deviceInfo, isOnline) {
    const ipAddress = typeof deviceInfo === "object" ? deviceInfo.ip : deviceInfo;
    const statusClass = isOnline ? 'bg-success' : 'bg-error';
    const statusText = isOnline ? '在线' : '离线';
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
                    <i class="fa fa-ping mr-1"></i> 测试连接
                </button>
                <a href="http://${ipAddress}:8000" target="_blank" rel="noopener noreferrer" class="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-md text-sm transition-colors flex items-center">
                    <i class="fa fa-cog mr-1"></i> 控制
                </a>
            </div>
        </div>
    `;
    return card;
}

// 更新卡片状态
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
            statusSpan.append(' 在线');
        } else {
            statusSpan.classList.add('bg-error');
            icon.classList.add('fa-times-circle');
            statusSpan.appendChild(icon);
            statusSpan.append(' 离线');
        }
    }
}

// 主函数
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
        const netTimestamp = await getNetworkTimestamp();
        const devices = await getDevicesFromGist();
        const deviceIds = Object.keys(devices);

        document.getElementById('total-services').textContent = deviceIds.length;

        let onlineCount = 0;
        deviceIds.forEach(deviceId => {
            const deviceInfo = devices[deviceId];
            const lastTimestamp = typeof deviceInfo === "object" ? deviceInfo.timestamp : 0;
            // left 10 seconds for network delay
            const isOnline = netTimestamp - lastTimestamp <= 130;
            if (isOnline) onlineCount++;
            const card = renderDeviceCard(deviceId, deviceInfo, isOnline);
            servicesContainer.appendChild(card);
        });

        document.getElementById('online-services').textContent = onlineCount;
        document.getElementById('offline-services').textContent = deviceIds.length - onlineCount;

        // 绑定“测试连接”按钮事件
        servicesContainer.querySelectorAll('.test-connection-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.replaceWith(newBtn);
            newBtn.addEventListener('click', async function () {
                newBtn.disabled = true;
                newBtn.textContent = '测试中...';
                let ok = false, result = '';
                try {
                    const [netTimestamp2, devices2] = await Promise.all([
                        getNetworkTimestamp(),
                        getDevicesFromGist()
                    ]);
                    const deviceId = newBtn.getAttribute('data-device');
                    const deviceInfo2 = devices2[deviceId];
                    const lastTimestamp2 = typeof deviceInfo2 === "object" ? deviceInfo2.timestamp : 0;
                    ok = netTimestamp2 - lastTimestamp2 <= 120;
                    result = ok
                        ? `设备 ${deviceId} 在线`
                        : `设备 ${deviceId} 离线`;
                } catch {
                    result = `设备状态未知`;
                }
                updateCardStatus(newBtn.closest('.card-shadow'), ok);
                alert(result);
                newBtn.disabled = false;
                newBtn.innerHTML = '<i class="fa fa-ping mr-1"></i> 测试连接';
            });
        });

        document.getElementById('last-updated').textContent = `最后更新: ${new Date().toLocaleString()}`;
        loading.classList.add('hidden');
        servicesContainer.classList.remove('hidden');
    } catch (err) {
        console.error('获取服务数据失败:', err);
        if (errorMessage) errorMessage.textContent = `错误: ${err.message}`;
        loading.classList.add('hidden');
        error.classList.remove('hidden');
    }
}

// 页面加载时获取数据
window.addEventListener('DOMContentLoaded', fetchAndDisplayServices);

// 刷新按钮点击事件
document.getElementById('refresh-btn').addEventListener('click', fetchAndDisplayServices);
