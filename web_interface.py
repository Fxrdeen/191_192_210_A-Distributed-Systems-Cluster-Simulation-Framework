from flask import Flask, render_template, request, jsonify
import requests
import json

app = Flask(__name__)
API_BASE_URL = 'http://127.0.0.1:5001'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/cluster/status')
def get_cluster_status():
    try:
        response = requests.get(f'{API_BASE_URL}/cluster/status')
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/nodes', methods=['POST'])
def add_node():
    try:
        data = request.get_json()
        response = requests.post(f'{API_BASE_URL}/nodes', json=data)
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/nodes/<node_id>', methods=['DELETE'])
def remove_node(node_id):
    try:
        response = requests.delete(f'{API_BASE_URL}/nodes/{node_id}')
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/pods', methods=['POST'])
def create_pod():
    try:
        data = request.get_json()
        response = requests.post(f'{API_BASE_URL}/pods', json=data)
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Run the web interface
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True) 