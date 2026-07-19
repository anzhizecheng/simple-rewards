#!/bin/bash
# ============================================================
#  勇者征程 · 启动脚本（macOS）
#  自动检测 Node.js，未安装则自动安装
# ============================================================
cd "$(dirname "$0")"

# 终端颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo "========================================"
echo -e "  ${CYAN}⚔️  勇者征程 · 本地服务器${NC}"
echo "========================================"
echo ""

# ============================================================
#  检查 Node.js 是否已安装
# ============================================================
check_node() {
  if command -v node &> /dev/null; then
    NODE_VER=$(node --version)
    echo -e "${GREEN}[Node.js ${NODE_VER}] 已就绪${NC}"
    return 0
  fi

  # 尝试常见路径
  for path in /usr/local/bin/node /opt/homebrew/bin/node ~/.nvm/versions/node/*/bin/node; do
    if [ -x "$path" ]; then
      export PATH="$(dirname "$path"):$PATH"
      NODE_VER=$("$path" --version)
      echo -e "${GREEN}[Node.js ${NODE_VER}] 已就绪${NC}"
      return 0
    fi
  done

  return 1
}

# ============================================================
#  自动安装 Node.js（macOS 版）
# ============================================================
install_node() {
  echo -e "${YELLOW}[1/3] Node.js 未安装，准备自动安装...${NC}"
  echo ""

  # 方案 A: 用 Homebrew 安装（优先）
  if command -v brew &> /dev/null; then
    echo -e "${CYAN}检测到 Homebrew，使用 brew 安装 Node.js...${NC}"
    echo "这可能需要 1-3 分钟，请保持网络畅通。"
    echo ""

    brew install node

    if command -v node &> /dev/null; then
      echo -e "${GREEN}安装成功!${NC}"
      return 0
    fi
    echo -e "${YELLOW}brew 安装未成功，尝试其他方式...${NC}"
  fi

  # 方案 B: 下载官方 .pkg 安装包
  echo -e "${CYAN}[2/3] 下载 Node.js LTS 安装包...${NC}"

  # 检测架构
  ARCH="x64"
  if [ "$(uname -m)" = "arm64" ]; then
    ARCH="arm64"
  fi

  echo "系统架构: ${ARCH}"
  PKG_URL="https://nodejs.org/dist/v22.14.0/node-v22.14.0-${ARCH}.pkg"
  PKG_PATH="/tmp/node-installer-${ARCH}.pkg"

  echo "下载地址: ${PKG_URL}"
  echo ""

  # 用 curl 下载，显示进度
  curl -L --progress-bar -o "$PKG_PATH" "$PKG_URL"

  if [ $? -ne 0 ] || [ ! -f "$PKG_PATH" ]; then
    echo -e "${RED}[错误] 下载失败，请手动安装 Node.js:${NC}"
    echo "   下载地址: https://nodejs.org/"
    echo ""
    echo "   或使用 Homebrew 安装:"
    echo "   brew install node"
    echo ""
    exit 1
  fi

  echo ""
  echo -e "${CYAN}[3/3] 正在安装 Node.js（需要输入管理员密码）...${NC}"
  echo "如果弹出密码提示，请输入您的 Mac 登录密码。"
  echo ""

  sudo installer -pkg "$PKG_PATH" -target /

  # 清理
  rm -f "$PKG_PATH"

  # 重新检查
  if command -v node &> /dev/null; then
    echo -e "${GREEN}安装成功!${NC}"
    return 0
  fi

  # 检查 /usr/local/bin
  if [ -x "/usr/local/bin/node" ]; then
    export PATH="/usr/local/bin:$PATH"
    echo -e "${GREEN}安装成功!${NC}"
    return 0
  fi

  echo -e "${RED}[错误] 安装后仍无法找到 Node.js${NC}"
  echo "请手动安装后重新运行本脚本。"
  echo "下载地址: https://nodejs.org/"
  echo ""
  exit 1
}

# ============================================================
#  主流程
# ============================================================

# 检查 Node.js
if ! check_node; then
  install_node
fi

echo ""

# 验证项目文件
if [ ! -f "server.js" ]; then
  echo -e "${RED}[错误] 未找到 server.js${NC}"
  echo "请确保本启动程序放在勇者征程项目目录下。"
  echo ""
  exit 1
fi
echo -e "${GREEN}[项目文件] 已确认${NC}"
echo ""

# 启动服务器
echo -e "${CYAN}[启动] 正在启动本地服务器...${NC}"
echo ""
echo "========================================"
echo "  勇者征程 · 本地存档服务器"
echo "========================================"
echo "  访问地址: http://localhost:3789"
echo "  存档目录: $(pwd)/save/"
echo "  存档格式: save/勇者征程-{角色名}.json"
echo ""
echo "  按 Ctrl+C 停止服务器"
echo "========================================"
echo ""

node server.js

echo ""
echo "服务器已停止。"
