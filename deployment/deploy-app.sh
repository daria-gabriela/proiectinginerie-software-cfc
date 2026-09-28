#!/bin/bash
# deploy-app.sh
# Unified deployment script for StudySync application
# journalctl -u studysync-backend.service -f ### for logs
# journalctl -u studysync-ml.service -f ### for logs

APP=$1

if [ -z "$APP" ]; then
    echo "Usage: $0 [studysync] [--build] | stop | offline | mlflow-on | mlflow-off"
    echo "  studysync - Deploys the StudySync application"
    exit 1
fi

# Make the script portable by using the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CONFIG_DIR="$SCRIPT_DIR/configs"

stop_all() {
    echo "Stopping StudySync backend services..."
    systemctl stop studysync-backend.service 2>/dev/null || true
    systemctl stop studysync-ml.service 2>/dev/null || true
    systemctl stop springboot.service 2>/dev/null || true
}

deploy_studysync() {
    echo "Deploying StudySync App..."

    # 1. Setup Backend
    echo "Configuring Service..."
    cp "$CONFIG_DIR/studysync-backend.service" /etc/systemd/system/studysync-backend.service
    systemctl daemon-reload
    
    echo "Starting StudySync Backend..."
    systemctl start studysync-backend.service
    systemctl enable studysync-backend.service

    echo "Starting StudySync ML Server..."
    cp "$CONFIG_DIR/studysync-ml.service" /etc/systemd/system/studysync-ml.service
    systemctl daemon-reload
    systemctl start studysync-ml.service
    systemctl enable studysync-ml.service

    # 2. Setup Nginx
    echo "Configuring Nginx..."
    cp "$CONFIG_DIR/nginx-studysync" /etc/nginx/sites-available/studysync
    
    # Manage symlinks
    rm -f /etc/nginx/sites-enabled/default
    ln -sf /etc/nginx/sites-available/studysync /etc/nginx/sites-enabled/studysync
    
    echo "Reloading Nginx..."
    if nginx -t; then
        systemctl reload nginx
        echo "StudySync App Deployed Successfully!"
    else
        echo "Nginx configuration failed! Check errors above."
    fi
}

# --- BUILD FUNCTIONS ---
build_studysync() {
    echo "Building StudySync Backend..."
    su - geo -c "cd /home/geo/proiect-inginerie-software-cfc/studysync-backend && ./mvnw clean package -DskipTests"
    
    echo "Building StudySync Frontend..."
    su - geo -c "cd /home/geo/proiect-inginerie-software-cfc/studysync-frontend && npm install && npm run build"

    # echo "Updating StudySync ML Dependencies..."
    # su - geo -c "cd /home/geo/proiect-inginerie-software-cfc/ml-server && ./venv/bin/pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && ./venv/bin/pip install --no-cache-dir -r requirements.txt"
}

# Execution Flow
case "$APP" in
    studysync)
        stop_all
        if [ "$2" == "--build" ]; then
            build_studysync
        fi
        deploy_studysync
        ;;
    stop)
        stop_all
        echo "All StudySync backend services have been stopped."
        ;;
    offline)
        echo "Taking StudySync Offline..."
        stop_all
        rm -f /etc/nginx/sites-enabled/studysync
        systemctl reload nginx
        echo "Website is now OFFLINE (Nginx running, app unlinked)."
        ;;
    mlflow-on)
        echo "Starting MLflow ecosystem..."
        systemctl start mlflow
        systemctl start minio
        systemctl start nginx
        echo "MLflow and MinIO started."
        ;;
    mlflow-off)
        echo "Stopping MLflow ecosystem..."
        systemctl stop mlflow
        systemctl stop minio
        echo "MLflow and MinIO stopped."
        ;;
    *)
        echo "Invalid command: $APP"
        echo "Usage: $0 studysync [--build] | stop | offline | mlflow-on | mlflow-off"
        echo "  studysync [--build] - Deploy StudySync App (optionally rebuild)"
        echo "  stop                - Stop backend (frontend still served)"
        echo "  offline             - Take website completely OFFLINE"
        echo "  mlflow-on           - Start MLflow Infrastructure"
        echo "  mlflow-off          - Stop MLflow Infrastructure"
        exit 1
        ;;
esac
