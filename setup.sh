#cloud-boothook
#!/bin/bash
sudo yum install -y git
git clone -b deployment https://github.com/mjyoussef/mowse.git
sudo yum install nodejs -y
cd mowse
npm install
node distribution.js --ip "0.0.0.0" --port 7070