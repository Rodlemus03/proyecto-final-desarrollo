#!/usr/bin/env bash
# Levanta el entorno completo del Proyecto Final con Colima.
# Uso: ./iniciar-colima.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_DIR="$SCRIPT_DIR/waf-siem"

echo "==> Verificando Colima..."
if ! colima status 2>/dev/null | grep -q "is running"; then
  echo "    Colima no está corriendo. Iniciando..."
  colima start
fi

echo "==> Levantando servicios Docker..."
docker compose -f "$COMPOSE_DIR/docker-compose.yml" --env-file "$COMPOSE_DIR/.env" up -d

echo "==> Esperando a que el WAF quede healthy..."
timeout=60
until docker inspect proyecto-final-waf-1 --format '{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; do
  sleep 3
  timeout=$((timeout - 3))
  if [ "$timeout" -le 0 ]; then
    echo "    Tiempo de espera agotado. Revisa: docker compose logs waf"
    break
  fi
done

echo "==> Creando túneles SSH (workaround Lima auto-forward)..."
pkill -f "ssh.*colima.*-L 8080" 2>/dev/null || true
pkill -f "ssh.*colima.*-L 9200" 2>/dev/null || true
pkill -f "ssh.*colima.*-L 5601" 2>/dev/null || true
sleep 1
ssh -F ~/.colima/ssh_config colima \
  -L 8080:127.0.0.1:8080 \
  -L 9200:127.0.0.1:9200 \
  -L 5601:127.0.0.1:5601 \
  -N -f
sleep 2

echo ""
echo "==> Verificando servicios:"
curl -s -o /dev/null -w "  WAF/API  http://localhost:8080/api/health -> %{http_code}\n" http://localhost:8080/api/health
curl -s -o /dev/null -w "  Web      http://localhost:3000             -> %{http_code}\n" http://localhost:3000
curl -s -o /dev/null -w "  Elastic  http://localhost:9200             -> %{http_code}\n" http://localhost:9200
curl -s -o /dev/null -w "  Kibana   http://localhost:5601             -> %{http_code}\n" http://localhost:5601

echo ""
echo "Listo. Accesos:"
echo "  App via WAF : http://localhost:8080"
echo "  Kibana SIEM : http://localhost:5601"
echo "  Elastic     : http://localhost:9200"
echo ""
echo "Para detener: docker compose -f waf-siem/docker-compose.yml down"
