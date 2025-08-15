const gist_url = 'https://api.github.com/gists/f04b26ce2b1b0685526b1e08282f469c';

// 设置当前年份
document.getElementById('current-year').textContent = new Date().getFullYear();

// 服务数据处理函数
async function fetchAndDisplayServices() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const servicesContainer = document.getElementById('services-container');
    const errorMessage = document.getElementById('error-message');
    
    // 重置状态
    loading.classList.remove('hidden');
    error.classList.add('hidden');
    servicesContainer.classList.add('hidden');
    servicesContainer.innerHTML = '';

    try {
        // 获取网络时间戳（用百度或其它公共服务）
        let netTimestamp = null;
        try {
            const resp = await fetch("https://www.baidu.com", { method: "HEAD" });
            const dateStr = resp.headers.get("date");
            netTimestamp = Math.floor(new Date(dateStr).getTime() / 1000);
        } catch (e) {
            // 兜底用本地时间
            netTimestamp = Math.floor(Date.now() / 1000);
        }

        // 从GitHub Gist获取数据
        const response = await fetch(gist_url);
        if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
        const data = await response.json();

        // 提取devices.json的内容
        const devicesJson = data.files['devices.json'];
        if (!devicesJson || !devicesJson.content) throw new Error('未找到有效的设备数据');

        // 解析设备数据
        const devices = JSON.parse(devicesJson.content);
        const deviceIds = Object.keys(devices);

        // 更新统计信息
        document.getElementById('total-services').textContent = deviceIds.length;

        // 判断在线状态
        let onlineCount = 0;
        for (const deviceId of deviceIds) {
            const deviceInfo = devices[deviceId];
            // 兼容老格式
            const ipAddress = typeof deviceInfo === "object" ? deviceInfo.ip : deviceInfo;
            const lastTimestamp = typeof deviceInfo === "object" ? deviceInfo.timestamp : 0;
            const isOnline = netTimestamp - lastTimestamp <= 120;

            if (isOnline) onlineCount++;

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
            servicesContainer.appendChild(card);
        }

        // 统计在线/离线
        document.getElementById('online-services').textContent = onlineCount;
        document.getElementById('offline-services').textContent = deviceIds.length - onlineCount;

        // 绑定“测试连接”按钮事件
        const testBtns = servicesContainer.querySelectorAll('.test-connection-btn');
        testBtns.forEach(btn => {
            // 用 replaceWith+cloneNode 彻底移除所有事件，防止多次绑定导致只第一次生效
            const newBtn = btn.cloneNode(true);
            btn.replaceWith(newBtn);
            newBtn.addEventListener('click', async function () {
                newBtn.disabled = true;
                newBtn.textContent = '测试中...';

                // 重新获取gist和网络时间
                let netTimestamp2 = null;
                try {
                    const resp = await fetch("https://www.baidu.com", { method: "HEAD" });
                    const dateStr = resp.headers.get("date");
                    netTimestamp2 = Math.floor(new Date(dateStr).getTime() / 1000);
                } catch (e) {
                    netTimestamp2 = Math.floor(Date.now() / 1000);
                }
                let deviceId = newBtn.getAttribute('data-device');
                let result = '';
                let ok = false;
                try {
                    const response2 = await fetch(gist_url);
                    const data2 = await response2.json();
                    const devices2 = JSON.parse(data2.files['devices.json'].content);
                    const deviceInfo2 = devices2[deviceId];
                    const lastTimestamp2 = typeof deviceInfo2 === "object" ? deviceInfo2.timestamp : 0;
                    ok = netTimestamp2 - lastTimestamp2 <= 120;
                    result = ok
                        ? `设备 ${deviceId} 在线`
                        : `设备 ${deviceId} 离线`;
                } catch (e) {
                    ok = false;
                    result = `设备 ${deviceId} 状态未知`;
                }

                // 更新卡片状态
                const card = newBtn.closest('.card-shadow');
                if (card) {
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
                alert(result);
                newBtn.disabled = false;
                newBtn.innerHTML = '<i class="fa fa-ping mr-1"></i> 测试连接';
            });
        });

        // 更新最后更新时间
        const now = new Date();
        document.getElementById('last-updated').textContent = `最后更新: ${now.toLocaleString()}`;

        // 显示服务列表，隐藏加载状态
        loading.classList.add('hidden');
        servicesContainer.classList.remove('hidden');
    } catch (err) {
        console.error('获取服务数据失败:', err);
        errorMessage.textContent = `错误: ${err.message}`;
        loading.classList.add('hidden');
        error.classList.remove('hidden');
    }
}

// 页面加载时获取数据
window.addEventListener('DOMContentLoaded', fetchAndDisplayServices);

// 刷新按钮点击事件
document.getElementById('refresh-btn').addEventListener('click', fetchAndDisplayServices);
    