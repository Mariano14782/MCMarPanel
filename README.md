THIS IS MY FIRST CONTRIBUTION, I´M SORRY IF IT´S NOT WHAT IT´S SUPPOSED TO BE

You can find the steps for the installation in installation_guide.txt
Puedes encontrar los pasos para la instalacion en el txt guia_instalacion.txt



Project created by "Mar" with the help of Claude Sonnet 4.6 through Google's Antigravity IDE. This project
is not intended to be commercial or serious — it is a personal project for learning and fun.
The design, ideas, implementations, resources, and features are the author's own suggestions. Libraries,
code, and technologies were implemented by Claude Sonnet 4.6 acting as an agent through Antigravity.

My knowledge of programming and web design is limited, which is why I turned to Claude Sonnet 4.6,
so I cannot guarantee that the project is 100% functional or secure.

MCMarPanel is a web administration dashboard for Minecraft servers.
It allows real-time server control via RCON, viewing connected players,
sending commands, global or player-specific messages, and monitoring
connection status.

TECHNOLOGY STACK
-----------------
  Backend  : Node.js 20 + Express + WebSocket (ws)
  Protocol : RCON via rcon-client
  Frontend : HTML + CSS + vanilla JavaScript (no frameworks)
  Fonts    : JetBrains Mono, Inter (Google Fonts)
  Docker   : node:20-alpine + Docker Compose


PROJECT STRUCTURE (inside docker/)
------------------------------------
  docker/
  |-- server.js            Main backend
  |-- package.json         Node.js dependencies
  |-- package-lock.json    Dependency lockfile
  |-- Dockerfile           Production Docker image
  |-- docker-compose.yml   Container orchestration
  |-- .dockerignore        Docker context exclusions
  |-- .env.example         Environment variables template
  |-- setup.sh             Interactive installation script
  |-- DEPLOY.md            Deployment guide
  |-- public/
      |-- index.html       Panel interface
      |-- css/style.css    Panel styles
      |-- js/app.js        Frontend logic


CONFIGURATION VARIABLES
------------------------
  PORT             Port where the panel is accessible (default: 3007)

  RCON_HOST        IP or hostname of the Minecraft server for RCON
                   If MC runs on the same machine as Docker: host-gateway
                   If MC runs on another machine: that machine's IP

  RCON_PORT        RCON port of the MC server (default: 25575)

  RCON_PASSWORD    RCON password configured in server.properties

  MC_LOCAL_HOST    Local IP of the MC server (for status ping)

  MC_LOCAL_PORT    MC server port (default: 25565)

  MC_EXT_HOST      Public domain or IP of the MC server

  MC_EXT_PORT      External port of the MC server (default: 25565)

  All these variables are configured interactively by setup.sh
  and saved in docker/.env before deployment.

  #This was an idea I had earlier when implementing Docker, so its operation may not be optimal
  #or 100% reliable.
  #The setup.sh script is interactive and guides you step by step to configure the panel.
  #(I may implement it directly in the panel in the future).
  #All of this was tested on my personal homelab where I run my MC server,
  #with Ubuntu Server 24.04.4 LTS.


BACKEND ENDPOINTS
------------------
  GET  /api/status         RCON status and current players
  GET  /api/players        List of online players
  POST /api/command        Execute arbitrary RCON command
  GET  /api/logs           In-memory log history (max 200)
  GET  /api/ping-servers   TCP ping to local and external server
  POST /api/restart        Send "stop" to the MC server
  POST /api/tell           Send message to a player or everyone

  WebSocket at /           Emits real-time events:
    history     -> previous logs on connect
    log         -> new log line
    players     -> updated player list
    count       -> player count + lastConnected
    rcon_status -> RCON connection status


STATUS INDICATOR (top right corner)
-------------------------------------
  Green "Online"       -> Panel WebSocket connected
  Red "Disconnected"   -> WebSocket disconnected or panel down

  NOTE: This indicator reflects whether the PANEL is working,
  NOT the RCON status or the Minecraft server state.
  The local/external IP badges in the host card
  do show whether the MC server responds via TCP.


DOCKER NETWORK CONSIDERATIONS
-------------------------------
  Docker containers have isolated networking (bridge by default).
  To reach services on the same host machine:
    - Use RCON_HOST=host-gateway
    - docker-compose.yml includes extra_hosts: host-gateway:host-gateway
      which automatically resolves that alias to the real host IP.
  To reach other LAN machines: use their IP directly.
  External traffic (internet) exits normally through the host NAT.


APPLIED CSS COMPATIBILITY
--------------------------
  -webkit-user-select    : none  (Safari 3+, iOS 3+)
  -webkit-optimize-contrast      (legacy Edge for pixel art)
  -webkit-fit-content            (Safari for width: fit-content)
  -webkit-backdrop-filter        (Safari for modal blur)
  -webkit-animation              (Safari for pulse animation)

================================================================
