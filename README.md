# Kubernetes-like Distributed Systems Cluster Simulator

This project implements a simplified Kubernetes-like cluster simulator that demonstrates core concepts of distributed systems, including node management, pod scheduling, and health monitoring.

## Features

- Node Management (add/remove nodes)
- Pod Scheduling with First-Fit algorithm
- Health Monitoring & Fault Tolerance
- Node Recovery & Pod Rescheduling
- Simple CLI Interface

## Prerequisites

- Python 3.9 or higher
- Docker installed and running
- pip (Python package manager)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd kubernetes-simulator
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Make sure Docker is running on your system.

## Running the Simulator

1. Start the API Server:
```bash
python api_server.py
```

2. In a new terminal, start the CLI client:
```bash
python cli_client.py
```

## Usage

The CLI provides the following commands:

- `add-node <cpu_capacity>`: Add a new node with specified CPU capacity
- `remove-node <node_id>`: Remove a node by ID
- `create-pod <cpu_required>`: Create a new pod with CPU requirements
- `status`: Show cluster status
- `help`: Show help message
- `exit`: Exit the program

### Example Usage

1. Add a node with 4 CPU cores:
```
add-node 4
```

2. Create a pod requiring 2 CPU cores:
```
create-pod 2
```

3. Check cluster status:
```
status
```

4. Remove a node:
```
remove-node <node_id>
```

## Architecture

### Components

1. **API Server**
   - Manages the entire cluster
   - Handles node and pod operations
   - Implements health monitoring
   - Runs on port 5000

2. **Node Manager**
   - Manages registered nodes
   - Tracks CPU resources
   - Handles node lifecycle

3. **Pod Scheduler**
   - Implements First-Fit scheduling algorithm
   - Manages pod placement
   - Handles pod rescheduling

4. **Health Monitor**
   - Tracks node health via heartbeats
   - Detects node failures
   - Triggers pod rescheduling

### Fault Tolerance

- Nodes send heartbeats every 5 seconds
- Nodes are marked as unhealthy after 3 missed heartbeats
- Pods are automatically rescheduled from failed nodes
- Cluster state is maintained in memory

## Notes

- This is a simplified simulation and does not implement all Kubernetes features
- The simulator uses Docker containers to simulate physical nodes
- CPU resources are simulated and not actually limited
- The system is designed for educational purposes to demonstrate distributed systems concepts 