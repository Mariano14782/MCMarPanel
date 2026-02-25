# MCMarPanel — Ubuntu Deployment Guide

## Requirements
- Ubuntu 20.04+ (or any distro with apt)
- Docker Engine 23+ with the Compose plugin
- Network access to the Minecraft server (for RCON)

---

## 1. Install Docker on Ubuntu

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
```

---

## 2. Copy the project to the server

**Option A — SCP from your PC:**
```bash
scp -r ./MCMARPANEL_DOCKER user@SERVER-IP:~/mcpanel
```

**Option B — Git:**
```bash
git clone https://github.com/your-user/mcpanel.git ~/mcpanel
```

---

## 3. Run the setup wizard

```bash
cd ~/mcpanel/MCMARPANEL_DOCKER
bash SETUP.sh
```

The script will show an **interactive menu** where you can configure:

| Variable | Description |
|---|---|
| `PORT` | Port where the panel will be accessible (default: 3007) |
| `RCON_HOST` | Minecraft server IP |
| `RCON_PORT` | RCON port on the server (default: 25575) |
| `RCON_PASSWORD` | RCON password defined in `server.properties` |
| `MC_LOCAL_HOST` | Local IP of the Minecraft server |
| `MC_LOCAL_PORT` | Minecraft server port (default: 25565) |
| `MC_EXT_HOST` | Public domain/IP of the server |
| `MC_EXT_PORT` | External Minecraft server port |

Select **"1) Edit configuration"**, adjust the values, then **"2) Save and deploy"**.

---

## 4. Access the panel

```
http://<server-IP>:<PORT>
```

---

## Useful commands

```bash
# View live logs
docker compose -f MCMARPANEL_DOCKER/docker-compose.yml logs -f

# Stop
docker compose -f MCMARPANEL_DOCKER/docker-compose.yml down

# Update after changes
docker compose -f MCMARPANEL_DOCKER/docker-compose.yml up -d --build

# Container status
docker ps
```

> **Tip:** You can also enter the `MCMARPANEL_DOCKER/` folder and run `docker compose` without `-f`:
> ```bash
> cd MCMARPANEL_DOCKER && docker compose up -d --build
> ```

---

## Minecraft Server Configuration

For RCON to work, add the following to `server.properties` on the MC server:

```properties
enable-rcon=true
rcon.port=25575
rcon.password=YOUR_PASSWORD
```

Restart the Minecraft server after making changes.
