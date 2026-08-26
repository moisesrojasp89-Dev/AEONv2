# ==============================================================================
# AEON Quantitative Engine — Production Dockerfile
# ==============================================================================
FROM python:3.11-slim-bullseye

# Evitar prompts interactivos y buffers de Python
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TZ=UTC

# Instalar dependencias del sistema y utilidades de red
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ca-certificates \
    tzdata \
    && ln -fs /usr/share/zoneinfo/UTC /etc/localtime \
    && dpkg-reconfigure --frontend noninteractive tzdata \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Crear usuario sin privilegios para ejecución segura
RUN groupadd -r aeon && useradd -r -g aeon -d /opt/aeon -s /sbin/nologin aeon

WORKDIR /opt/aeon

# Copiar scripts y requerimientos
COPY scripts/quant/ /opt/aeon/scripts/quant/

# Instalar librerías científicas requeridas
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir numpy dataclasses-json

# Crear directorio de persistencia de estado con permisos
RUN mkdir -p /opt/aeon/data && chown -R aeon:aeon /opt/aeon

USER aeon
WORKDIR /opt/aeon/scripts/quant

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD test -f /opt/aeon/data/trade_watcher_state.json || exit 1

ENTRYPOINT ["python", "trade_watcher_daemon.py"]
