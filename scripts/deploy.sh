#!/bin/bash
set -e

cd /root/kuchizu.com
echo "Pulling latest changes..."
git pull origin master

echo "Building image..."
docker build -t kuchizu/portfolio:latest . -q

echo "Importing to k3s..."
docker save kuchizu/portfolio:latest | sudo k3s ctr images import - 2>/dev/null

echo "Restarting pods..."
sudo kubectl rollout restart deployment/kuchizu-portfolio -n kuchizu-portfolio
sudo kubectl rollout status deployment/kuchizu-portfolio -n kuchizu-portfolio --timeout=120s

echo "Done!"
sudo kubectl get pods -n kuchizu-portfolio
