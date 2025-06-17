# Use Node.js + Python base image
FROM node:18-bullseye

# Install Python3, pip, and Puppeteer dependencies
RUN apt-get update && \
    apt-get install -y \
    python3 python3-pip \
    wget gnupg ca-certificates fonts-liberation \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libxss1 libxcomposite1 libxrandr2 libgbm1 libasound2 \
    libpangocairo-1.0-0 libgtk-3-0 xdg-utils \
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy and install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy all project files
COPY . .

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Expose backend port
EXPOSE 8080

# Start Node.js server
CMD ["node", "server.js"]