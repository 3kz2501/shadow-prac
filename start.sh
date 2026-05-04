#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}ShadowPrac${NC} - Starting..."

# Install backend deps if needed
if ! python3 -c "import fastapi" 2>/dev/null; then
  echo -e "${GREEN}Installing backend dependencies...${NC}"
  pip install -r "$DIR/backend/requirements.txt" -q
fi

# Install frontend deps if needed
if [ ! -d "$DIR/frontend/node_modules" ]; then
  echo -e "${GREEN}Installing frontend dependencies...${NC}"
  cd "$DIR/frontend" && npm install --silent
fi

# Start backend
echo -e "${GREEN}Starting backend on :8000${NC}"
cd "$DIR/backend"
python3 -u main.py &
BACKEND_PID=$!

# Start frontend
echo -e "${GREEN}Starting frontend on :5173${NC}"
cd "$DIR/frontend"
npx vite --host &
FRONTEND_PID=$!

# Cleanup on exit
cleanup() {
  echo ""
  echo -e "${CYAN}Shutting down...${NC}"
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
}
trap cleanup EXIT INT TERM

echo ""
echo -e "${CYAN}Ready!${NC}"
echo -e "  App:     ${GREEN}http://localhost:5173${NC}"
echo -e "  API:     http://localhost:8000"
echo -e "  API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop."

wait
