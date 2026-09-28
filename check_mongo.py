import socket
import sys

def check_mongo(host="localhost", port=27017):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(2)
    try:
        s.connect((host, port))
        print(f"Success: Connected to MongoDB at {host}:{port}")
        s.close()
        return True
    except Exception as e:
        print(f"Error: Could not connect to MongoDB at {host}:{port}. Exception: {e}")
        return False

if __name__ == "__main__":
    if check_mongo():
        sys.exit(0)
    else:
        sys.exit(1)
