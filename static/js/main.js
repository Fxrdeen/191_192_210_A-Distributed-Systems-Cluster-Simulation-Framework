// Global variables
let refreshInterval;
let healthMonitoringInterval;
let isMonitoringActive = true;
let healthHistory = {
    nodes: {},
    pods: {}
};

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    startRefreshInterval();
    startHealthMonitoring();
    refreshStatus();
});

// Initialize event listeners
function initializeEventListeners() {
    // Add Node form submission
    document.getElementById('addNodeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const cpuCapacity = document.getElementById('cpuCapacity').value;
        
        // Client-side validation for CPU capacity
        if (parseInt(cpuCapacity) > 8) {
            showError('Node not created: CPU capacity too high (maximum is 8 cores)');
            return;
        }
        
        await addNode(cpuCapacity);
    });

    // Create Pod form submission
    document.getElementById('createPodForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const cpuRequired = document.getElementById('podCpuRequired').value;
        const image = document.getElementById('podImage').value;
        await createPod(cpuRequired, image);
    });
}

// Start the refresh interval
function startRefreshInterval() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(refreshStatus, 10000);
}

// Start health monitoring
function startHealthMonitoring() {
    if (healthMonitoringInterval) clearInterval(healthMonitoringInterval);
    healthMonitoringInterval = setInterval(updateHealthMonitoring, 5000);
    isMonitoringActive = true;
    updateMonitoringStatus();
}

// Toggle health monitoring
function toggleMonitoring() {
    if (isMonitoringActive) {
        if (healthMonitoringInterval) clearInterval(healthMonitoringInterval);
        isMonitoringActive = false;
    } else {
        startHealthMonitoring();
    }
    updateMonitoringStatus();
}

// Update monitoring status UI
function updateMonitoringStatus() {
    const statusBadge = document.getElementById('monitoringStatus');
    const toggleButton = statusBadge.nextElementSibling;
    
    if (isMonitoringActive) {
        statusBadge.className = 'badge bg-success me-2';
        statusBadge.textContent = 'Active';
        toggleButton.innerHTML = '<i class="fas fa-pause me-1"></i> Pause';
    } else {
        statusBadge.className = 'badge bg-secondary me-2';
        statusBadge.textContent = 'Paused';
        toggleButton.innerHTML = '<i class="fas fa-play me-1"></i> Resume';
    }
}

// Show error message
function showError(message) {
    const errorAlert = document.getElementById('errorAlert');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorAlert.classList.remove('d-none');
    errorAlert.classList.add('show');
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        errorAlert.classList.remove('show');
        setTimeout(() => {
            errorAlert.classList.add('d-none');
        }, 150);
    }, 10000);
}

// Show success message
function showSuccess(message) {
    const successAlert = document.getElementById('successAlert');
    const successMessage = document.getElementById('successMessage');
    successMessage.textContent = message;
    successAlert.classList.remove('d-none');
    successAlert.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        successAlert.classList.remove('show');
        setTimeout(() => {
            successAlert.classList.add('d-none');
        }, 150);
    }, 5000);
}

// Manual refresh function for the refresh button
function manualRefresh() {
    showSuccess('Refreshing cluster status...');
    refreshStatus();
}

// Refresh cluster status
async function refreshStatus() {
    try {
        const response = await fetch('/api/cluster/status');
        const data = await response.json();
        renderClusterStatus(data);
        
        // Update health history
        if (data.nodes) {
            updateHealthHistory(data);
        }
    } catch (error) {
        console.error('Error refreshing status:', error);
        showError('Failed to fetch cluster status');
    }
}

// Update health history
function updateHealthHistory(data) {
    const timestamp = new Date().toISOString();
    
    // Update node health history
    Object.entries(data.nodes).forEach(([nodeId, nodeData]) => {
        if (!healthHistory.nodes[nodeId]) {
            healthHistory.nodes[nodeId] = [];
        }
        
        // Keep only the last 10 entries
        if (healthHistory.nodes[nodeId].length >= 10) {
            healthHistory.nodes[nodeId].shift();
        }
        
        // Calculate CPU usage
        const cpuUsage = nodeData.pods.reduce((sum, pod) => sum + (pod.cpu_required || 0), 0);
        const cpuCapacity = nodeData.cpu_capacity || 0;
        const cpuPercentage = cpuCapacity > 0 ? (cpuUsage / cpuCapacity) * 100 : 0;
        
        // Calculate memory usage
        const memoryUsage = nodeData.health_metrics && nodeData.health_metrics.memory_usage_percent !== undefined 
            ? nodeData.health_metrics.memory_usage_percent 
            : 0;
        
        // Add new health data
        healthHistory.nodes[nodeId].push({
            timestamp,
            status: nodeData.status,
            cpuUsage: cpuPercentage,
            memoryUsage: memoryUsage,
            podCount: nodeData.pods.length,
            healthMetrics: nodeData.health_metrics || {}
        });
    });
    
    // Update pod health history
    Object.entries(data.nodes).forEach(([nodeId, nodeData]) => {
        nodeData.pods.forEach(pod => {
            if (!healthHistory.pods[pod.id]) {
                healthHistory.pods[pod.id] = [];
            }
            
            // Keep only the last 10 entries
            if (healthHistory.pods[pod.id].length >= 10) {
                healthHistory.pods[pod.id].shift();
            }
            
            // Add new health data
            healthHistory.pods[pod.id].push({
                timestamp,
                nodeId,
                cpuRequired: pod.cpu_required,
                status: 'running' // Assuming pods are running if they're in the list
            });
        });
    });
}

// Update health monitoring display
function updateHealthMonitoring() {
    if (!isMonitoringActive) return;

    const nodeHealthMonitor = document.getElementById('nodeHealthMonitor');
    const podHealthMonitor = document.getElementById('podHealthMonitor');
    const monitoringStatus = document.getElementById('monitoringStatus');

    // Update monitoring status badge
    monitoringStatus.className = 'badge bg-success';
    monitoringStatus.textContent = 'Active';

    // Fetch cluster status data
    fetch('/api/cluster/status')
        .then(response => response.json())
        .then(data => {
            // Update node health
            if (data.nodes && Object.keys(data.nodes).length > 0) {
                const existingNodes = new Set(Array.from(nodeHealthMonitor.children).map(el => el.dataset.nodeId));
                const currentNodes = new Set(Object.keys(data.nodes));

                // Remove nodes that no longer exist
                existingNodes.forEach(nodeId => {
                    if (!currentNodes.has(nodeId)) {
                        const nodeElement = nodeHealthMonitor.querySelector(`[data-node-id="${nodeId}"]`);
                        if (nodeElement) {
                            nodeElement.classList.add('fade-out');
                            setTimeout(() => nodeElement.remove(), 300);
                        }
                    }
                });

                // Update or add nodes
                Object.entries(data.nodes).forEach(([nodeId, nodeData]) => {
                    const existingNode = nodeHealthMonitor.querySelector(`[data-node-id="${nodeId}"]`);
                    const newNodeElement = renderNodeHealthMonitoring(nodeId, nodeData);
                    
                    if (existingNode) {
                        // Smoothly update existing node
                        newNodeElement.classList.add('fade-in');
                        existingNode.replaceWith(newNodeElement);
                    } else {
                        // Add new node with animation
                        newNodeElement.classList.add('fade-in');
                        nodeHealthMonitor.appendChild(newNodeElement);
                    }
                });
            } else {
                if (nodeHealthMonitor.children.length > 0) {
                    nodeHealthMonitor.innerHTML = '';
                }
                nodeHealthMonitor.innerHTML = `
                    <div class="text-center text-muted p-4">
                        <i class="fas fa-server fa-2x mb-2"></i>
                        <p>No nodes available</p>
                    </div>
                `;
            }

            // Update pod health
            if (data.nodes) {
                const allPods = [];
                Object.entries(data.nodes).forEach(([nodeId, nodeData]) => {
                    nodeData.pods.forEach(pod => {
                        // Get the pod's metrics from the API response
                        const podMetrics = pod.metrics || {};
                        allPods.push({
                            id: pod.id,
                            name: `Pod ${pod.id}`,
                            node_id: nodeId,
                            cpu_required: pod.cpu_required,
                            status: pod.status || 'running',
                            cpu_usage: podMetrics.cpu_usage || 0,
                            memory_usage: podMetrics.memory_usage || 0,
                            memory_required: podMetrics.memory_limit || 1024 // Default to 1GB if not specified
                        });
                    });
                });

                if (allPods.length > 0) {
                    const existingPods = new Set(Array.from(podHealthMonitor.children).map(el => el.dataset.podId));
                    const currentPods = new Set(allPods.map(pod => pod.id));

                    // Remove pods that no longer exist
                    existingPods.forEach(podId => {
                        if (!currentPods.has(podId)) {
                            const podElement = podHealthMonitor.querySelector(`[data-pod-id="${podId}"]`);
                            if (podElement) {
                                podElement.classList.add('fade-out');
                                setTimeout(() => podElement.remove(), 300);
                            }
                        }
                    });

                    // Update or add pods
                    allPods.forEach(pod => {
                        const existingPod = podHealthMonitor.querySelector(`[data-pod-id="${pod.id}"]`);
                        const newPodElement = renderPodHealthMonitoring(pod);
                        
                        if (existingPod) {
                            // Smoothly update existing pod
                            newPodElement.classList.add('fade-in');
                            existingPod.replaceWith(newPodElement);
                        } else {
                            // Add new pod with animation
                            newPodElement.classList.add('fade-in');
                            podHealthMonitor.appendChild(newPodElement);
                        }
                    });
                } else {
                    if (podHealthMonitor.children.length > 0) {
                        podHealthMonitor.innerHTML = '';
                    }
                    podHealthMonitor.innerHTML = `
                        <div class="text-center text-muted p-4">
                            <i class="fas fa-cube fa-2x mb-2"></i>
                            <p>No pods running</p>
                        </div>
                    `;
                }
            }
        })
        .catch(error => {
            console.error('Error fetching health data:', error);
            showError('Failed to fetch health monitoring data');
        });
}

// Render node health monitoring
function renderNodeHealthMonitoring(nodeId, nodeData) {
    const healthItem = document.createElement('div');
    healthItem.className = 'health-item';
    healthItem.dataset.nodeId = nodeId;
    
    // Get real metrics from health_metrics
    const healthMetrics = nodeData.health_metrics || {};
    
    const memoryPercentage = healthMetrics.memory_usage_percent || 0;
    const memoryUsageMB = healthMetrics.memory_usage_mb || 0;
    const memoryLimitMB = healthMetrics.memory_limit_mb || 0;
    const runningPods = healthMetrics.running_pods || 0;
    const containerStatus = healthMetrics.container_status || 'unknown';
    
    // Determine status based on memory metrics
    let statusClass = 'healthy';
    if (memoryPercentage > 80) {
        statusClass = 'unhealthy';
    } else if (memoryPercentage > 60) {
        statusClass = 'warning';
    }
    
    healthItem.innerHTML = `
        <div class="health-item-header">
            <h6 class="health-item-title">Node ${nodeId}</h6>
            <span class="health-item-status ${statusClass}">${nodeData.status}</span>
        </div>
        <div class="health-metrics">
            <div class="metric">
                <span class="metric-label">Memory Usage:</span>
                <div class="metric-bar">
                    <div class="bar-fill ${statusClass}" style="width: ${memoryPercentage}%"></div>
                </div>
                <span class="metric-value">${memoryUsageMB.toFixed(1)}MB / ${memoryLimitMB.toFixed(1)}MB (${memoryPercentage.toFixed(1)}%)</span>
            </div>
            <div class="metric">
                <span class="metric-label">Running Pods:</span>
                <span class="metric-value">${runningPods}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Container Status:</span>
                <span class="metric-value">${containerStatus}</span>
            </div>
        </div>
        <div class="health-timestamp">
            Last updated: ${new Date().toLocaleTimeString()}
        </div>
    `;
    
    return healthItem;
}

// Render pod health monitoring
function renderPodHealthMonitoring(pod) {
    const healthItem = document.createElement('div');
    healthItem.className = 'health-item';
    healthItem.dataset.podId = pod.id;
    
    // Calculate percentages from real metrics
    let cpuPercentage = 0;
    if (pod.cpu_usage && pod.cpu_required) {
        // Normalize CPU usage based on the pod's CPU requirement
        // Docker provides CPU usage as a percentage of total system CPU
        // We need to normalize it based on the pod's CPU requirement
        const systemCpuCount = 1; // Default to 1 if not available
        cpuPercentage = Math.min((pod.cpu_usage / (pod.cpu_required * systemCpuCount * 1000000000)) * 100, 100);
    }
    
    const memoryPercentage = Math.min((pod.memory_usage / pod.memory_required) * 100, 100);
    
    // Determine status based on real metrics
    let statusClass = 'healthy';
    if (cpuPercentage > 80 || memoryPercentage > 80) {
        statusClass = 'unhealthy';
    } else if (cpuPercentage > 60 || memoryPercentage > 60) {
        statusClass = 'warning';
    }
    
    healthItem.innerHTML = `
        <div class="health-item-header">
            <h6 class="health-item-title">${pod.name}</h6>
            <span class="health-item-status ${statusClass}">${pod.status}</span>
        </div>
        <div class="health-metrics">
            <div class="metric">
                <span class="metric-label">CPU Usage:</span>
                <div class="metric-bar">
                    <div class="bar-fill ${statusClass}" style="width: ${Math.min(cpuPercentage, 100)}%"></div>
                </div>
                <span class="metric-value">${pod.cpu_usage.toFixed(2)} / ${pod.cpu_required} cores (${Math.min(cpuPercentage, 100).toFixed(1)}%)</span>
            </div>
            <div class="metric">
                <span class="metric-label">Memory Usage:</span>
                <div class="metric-bar">
                    <div class="bar-fill ${statusClass}" style="width: ${memoryPercentage}%"></div>
                </div>
                <span class="metric-value">${(pod.memory_usage / (1024 * 1024)).toFixed(1)}MB / ${(pod.memory_required / (1024 * 1024)).toFixed(1)}MB (${memoryPercentage.toFixed(1)}%)</span>
            </div>
            <div class="metric">
                <span class="metric-label">Node:</span>
                <span class="metric-value">${pod.node_id}</span>
            </div>
        </div>
        <div class="health-timestamp">
            Last updated: ${new Date().toLocaleTimeString()}
        </div>
    `;
    
    return healthItem;
}

// Render cluster status
function renderClusterStatus(data) {
    const clusterStatus = document.getElementById('clusterStatus');
    const nodesList = document.getElementById('nodesList');
    const podsList = document.getElementById('podsList');

    // Clear existing content
    clusterStatus.innerHTML = '';
    nodesList.innerHTML = '';
    podsList.innerHTML = '';

    // Add cluster summary
    const totalNodes = data.nodes ? Object.keys(data.nodes).length : 0;
    const healthyNodes = data.nodes ? Object.values(data.nodes).filter(node => node.status === 'healthy').length : 0;
    const totalPods = data.nodes ? Object.values(data.nodes).reduce((sum, node) => sum + node.pods.length, 0) : 0;
    
    clusterStatus.innerHTML = `
        <div class="col-12 mb-4">
            <div class="row g-3">
                <div class="col-md-3">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h3 class="mb-0">${totalNodes}</h3>
                            <p class="text-muted mb-0">Total Nodes</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h3 class="mb-0">${healthyNodes}</h3>
                            <p class="text-muted mb-0">Healthy Nodes</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h3 class="mb-0">${totalPods}</h3>
                            <p class="text-muted mb-0">Total Pods</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h3 class="mb-0">8</h3>
                            <p class="text-muted mb-0">Max CPU/Node</p>
                            <small class="text-muted">System limit</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (!data.nodes || Object.keys(data.nodes).length === 0) {
        nodesList.innerHTML = `
            <div class="col-12 text-center text-muted p-5">
                <i class="fas fa-server fa-3x mb-3"></i>
                <h5>No nodes available</h5>
                <p>Add a node to get started</p>
                <div class="alert alert-warning mt-3">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Note:</strong> You cannot create pods until you add at least one node to the cluster.
                </div>
            </div>
        `;
        return;
    }

    // Render nodes
    Object.entries(data.nodes).forEach(([nodeId, nodeData]) => {
        const nodeCard = createNodeCard(nodeId, nodeData);
        nodesList.appendChild(nodeCard);
    });
}

// Create node card
function createNodeCard(nodeId, nodeData) {
    const col = document.createElement('div');
    col.className = 'col-md-6 mb-4 fade-in';
    
    const cpuUsage = nodeData.pods.reduce((sum, pod) => sum + (pod.cpu_required || 0), 0);
    const cpuCapacity = nodeData.cpu_capacity || 0;
    const cpuPercentage = cpuCapacity > 0 ? (cpuUsage / cpuCapacity) * 100 : 0;
    const statusClass = nodeData.status === 'healthy' ? 'status-healthy' : 'status-unhealthy';
    const cpuBarClass = cpuPercentage > 80 ? 'bg-danger' : (cpuPercentage > 60 ? 'bg-warning' : 'bg-primary');

    col.innerHTML = `
        <div class="node-card">
            <div class="node-header">
                <div>
                    <span class="node-title">Node ${nodeId}</span>
                    <span class="status-badge ${statusClass} ms-2">
                        ${nodeData.status}
                    </span>
                </div>
                <button class="btn btn-sm btn-danger" onclick="removeNode('${nodeId}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            
            <div class="health-metrics mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <small class="text-muted">Health Status</small>
                    <small class="text-muted">Last Check: ${new Date(nodeData.last_heartbeat).toLocaleTimeString()}</small>
                </div>
                <div class="metrics-grid">
                    ${nodeData.health_metrics ? `
                        <div class="metric-item">
                            <i class="fas fa-memory text-primary"></i>
                            <span>Memory: ${(nodeData.health_metrics.memory_usage_percent || 0).toFixed(1)}%</span>
                        </div>
                        <div class="metric-item">
                            <i class="fas fa-microchip text-success"></i>
                            <span>Pods: ${nodeData.health_metrics.running_pods || 0}</span>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="resource-info d-flex justify-content-between mb-2">
                <span>CPU Usage</span>
                <span>${cpuUsage.toFixed(1)} / ${cpuCapacity} cores</span>
            </div>
            <div class="resource-bar">
                <div class="resource-bar-fill ${cpuBarClass}" style="width: ${Math.min(cpuPercentage, 100)}%"></div>
            </div>
            <div class="text-end">
                <small class="text-muted">${cpuPercentage.toFixed(1)}% used</small>
            </div>

            <div class="pod-list">
                <div class="d-flex justify-content-between mb-2">
                    <small class="text-muted">Pods (${nodeData.pods.length})</small>
                </div>
                ${nodeData.pods.length > 0 ? nodeData.pods.map(pod => `
                    <div class="pod-item">
                        <span><i class="fas fa-cube me-2"></i>Pod ${pod.id}</span>
                        <span class="text-muted">${pod.cpu_required} CPU</span>
                    </div>
                `).join('') : `
                    <div class="text-center text-muted py-2">
                        <i class="fas fa-info-circle me-1"></i> No pods running on this node
                    </div>
                `}
            </div>
        </div>
    `;

    return col;
}

// Add node
async function addNode(cpuCapacity) {
    try {
        const response = await fetch('/api/nodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpu_capacity: parseInt(cpuCapacity) })
        });
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Node added successfully');
            document.getElementById('cpuCapacity').value = '';
            refreshStatus();
        } else {
            // Check for specific error messages
            if (data.error && data.error.includes('CPU capacity too high')) {
                showError(`Node not created: ${data.error}`);
            } else if (data.error && data.error.includes('No suitable node found')) {
                showError(`Failed to create pod: No node has enough CPU capacity (${cpuRequired} cores required). Please add a node with sufficient capacity first.`);
            } else if (data.error && data.error.includes('No nodes available')) {
                showError('Failed to create pod: No nodes available in the cluster. Please add a node first.');
            } else {
                showError(data.error || 'Failed to add node');
            }
        }
    } catch (error) {
        console.error('Error adding node:', error);
        showError('Failed to add node: Network error or server unavailable');
    }
}

// Remove node
async function removeNode(nodeId) {
    if (!confirm(`Are you sure you want to remove Node ${nodeId}?`)) return;
    
    try {
        const response = await fetch(`/api/nodes/${nodeId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (response.ok) {
            showSuccess(`Node removed successfully. Rescheduled pods: ${data.rescheduled_pods}`);
            refreshStatus();
        } else {
            showError(data.error || 'Failed to remove node');
        }
    } catch (error) {
        console.error('Error removing node:', error);
        showError('Failed to remove node: Network error or server unavailable');
    }
}

// Create pod
async function createPod(cpuRequired, image) {
    try {
        const response = await fetch('/api/pods', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                cpu_required: parseInt(cpuRequired),
                image: image
            })
        });
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Pod created successfully');
            document.getElementById('podCpuRequired').value = '';
            refreshStatus();
        } else {
            // Check for specific error messages
            if (data.error && data.error.includes('No suitable node found')) {
                showError(`Failed to create pod: No node has enough CPU capacity (${cpuRequired} cores required). Please add a node with sufficient capacity first.`);
            } else if (data.error && data.error.includes('No nodes available')) {
                showError('Failed to create pod: No nodes available in the cluster. Please add a node first.');
            } else {
                showError(data.error || 'Failed to create pod');
            }
        }
    } catch (error) {
        console.error('Error creating pod:', error);
        showError('Failed to create pod: Network error or server unavailable');
    }
}

function getStatusClass(percentage) {
    if (percentage >= 80) return 'unhealthy';
    if (percentage >= 60) return 'warning';
    return 'healthy';
} 