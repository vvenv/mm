#!/usr/bin/env bash
# 发布 Markdown Mindmap 到 mm.wenfu.dev：同步 public、装 nginx、没有证书就申请。
#
#   bash scripts/deploy.sh
#   pnpm deploy
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/lib/remote.sh
source "$ROOT/scripts/lib/remote.sh"

load_production_env

PUBLIC="$ROOT/public"
DOMAIN="$MM_DOMAIN"
WEB_ROOT="$MM_WEB_ROOT"
SITE_AVAILABLE="/etc/nginx/sites-available/${DOMAIN}"
SITE_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"

log() { printf '[mm] %s\n' "$*"; }
die() { printf '[mm] %s\n' "$*" >&2; exit 1; }

install_nginx() {
  local conf="$1"
  log "安装 nginx 站点 ${DOMAIN}"
  remote_scp "$conf" "/tmp/${DOMAIN}.conf"
  remote_ssh "cp /tmp/${DOMAIN}.conf ${SITE_AVAILABLE} && ln -sfn ${SITE_AVAILABLE} ${SITE_ENABLED} && nginx -t && systemctl reload nginx"
}

[ -f "$PUBLIC/index.html" ] || die "缺少 $PUBLIC/index.html"

log "同步到 ${REMOTE_TARGET}:${WEB_ROOT}"
remote_ssh "mkdir -p $(printf '%q' "$WEB_ROOT") /var/www/certbot"
remote_rsync "${PUBLIC}/" "${WEB_ROOT}/"
remote_ssh "chmod -R a+rX $(printf '%q' "$WEB_ROOT")"

if ! remote_ssh "test -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem"; then
  install_nginx "$ROOT/deploy/nginx/${DOMAIN}.http-only.conf"
  log "申请证书 ${DOMAIN}"
  remote_ssh "certbot certonly --webroot -w /var/www/certbot -d ${DOMAIN} --non-interactive --agree-tos --keep-until-expiring"
fi

install_nginx "$ROOT/deploy/nginx/${DOMAIN}.conf"

log "检查 https://${DOMAIN}/"
html="$(curl -fsS "https://${DOMAIN}/")"
printf '%s' "$html" | grep -q 'Markdown Mindmap' || die "首页没有「Markdown Mindmap」"
curl -fsS -o /dev/null "https://${DOMAIN}/"
core_type="$(curl -fsSI "https://${DOMAIN}/mm-core.js" | tr -d '\r' | grep -i '^content-type:' | head -1)"
printf '%s\n' "$core_type" | grep -Eqi 'javascript|ecmascript' || die "mm-core.js Content-Type 异常：$core_type"

log "已发布 https://${DOMAIN}/"
