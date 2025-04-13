import requests
import json
import sys
import time
import multiprocessing

# Update BASE_URL to use the IP address where the server is running
BASE_URL = 'http://127.0.0.1:5000'

def check_server():
    try:
        response = requests.get(f'{BASE_URL}/cluster/status')
        return True
    except requests.exceptions.ConnectionError:
        print("Error: Cannot connect to the API server.")
        print("Please make sure the API server is running (python api_server.py)")
        print(f"Trying to connect to: {BASE_URL}")
        return False
    except Exception as e:
        print(f"Error checking server: {str(e)}")
        return False

def print_help():
    # Get system CPU count
    system_cpu = multiprocessing.cpu_count()
    max_node_cpu = min(8, system_cpu)
    max_pod_cpu = min(6, system_cpu)
    
    print(f"""
Kubernetes-like Simulator CLI
----------------------------
System Information:
- Available CPU cores: {system_cpu}
- Maximum node CPU capacity: {max_node_cpu} cores
- Maximum pod CPU requirement: {max_pod_cpu} cores
- Total CPU capacity across all nodes cannot exceed {system_cpu} cores

Commands:
1. add-node <cpu_capacity>    - Add a new node with specified CPU capacity (max {max_node_cpu} cores per node)
2. remove-node <node_id>      - Remove a node by ID
3. create-pod <cpu_required> [image] - Create a new pod with CPU requirements (max {max_pod_cpu} cores) and optional image
4. status                    - Show cluster status
5. help                      - Show this help message
6. exit                      - Exit the program

Resource Limits:
- Nodes: Maximum of {max_node_cpu} CPU cores per node
- Pods: Maximum of {max_pod_cpu} CPU cores per pod
- Total CPU capacity across all nodes cannot exceed {system_cpu} cores
- All CPU values must be positive integers

Available Container Images:
- nginx:latest (default)
- httpd:latest
- python:3.9-slim
- redis:latest
- mysql:5.7
    """)

def add_node(cpu_capacity):
    try:
        response = requests.post(f'{BASE_URL}/nodes', json={'cpu_capacity': int(cpu_capacity)})
        print(json.dumps(response.json(), indent=2))
    except requests.exceptions.ConnectionError:
        print("Error: Cannot connect to the API server. Is it running?")
    except Exception as e:
        print(f"Error: {str(e)}")

def remove_node(node_id):
    try:
        response = requests.delete(f'{BASE_URL}/nodes/{node_id}')
        print(json.dumps(response.json(), indent=2))
    except requests.exceptions.ConnectionError:
        print("Error: Cannot connect to the API server. Is it running?")
    except Exception as e:
        print(f"Error: {str(e)}")

def create_pod(args):
    try:
        cpu_required = int(args[0])
        
        # Get optional image if specified
        image = args[1] if len(args) > 1 else 'nginx:latest'
        
        response = requests.post(f'{BASE_URL}/pods', json={
            'cpu_required': cpu_required,
            'image': image
        })
        print(json.dumps(response.json(), indent=2))
    except requests.exceptions.ConnectionError:
        print("Error: Cannot connect to the API server. Is it running?")
    except Exception as e:
        print(f"Error: {str(e)}")

def show_status():
    try:
        response = requests.get(f'{BASE_URL}/cluster/status')
        print(json.dumps(response.json(), indent=2))
    except requests.exceptions.ConnectionError:
        print("Error: Cannot connect to the API server. Is it running?")
    except Exception as e:
        print(f"Error: {str(e)}")

def main():
    print("Welcome to Kubernetes-like Simulator CLI")
    print_help()
    
    # Wait for server to be ready
    print("Waiting for API server to be ready...")
    for _ in range(5):  # Try for 5 seconds
        if check_server():
            break
        time.sleep(1)
    
    while True:
        try:
            command = input("\nEnter command: ").strip().split()
            if not command:
                continue
                
            cmd = command[0].lower()
            
            if cmd == 'exit':
                print("Goodbye!")
                sys.exit(0)
            elif cmd == 'help':
                print_help()
            elif cmd == 'status':
                show_status()
            elif cmd == 'add-node' and len(command) == 2:
                add_node(command[1])
            elif cmd == 'remove-node' and len(command) == 2:
                remove_node(command[1])
            elif cmd == 'create-pod' and len(command) >= 2:
                create_pod(command[1:])
            else:
                print("Invalid command. Type 'help' for available commands.")
                
        except KeyboardInterrupt:
            print("\nGoodbye!")
            sys.exit(0)
        except Exception as e:
            print(f"Error: {str(e)}")

if __name__ == '__main__':
    main() 