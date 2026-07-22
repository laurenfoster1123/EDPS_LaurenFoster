// ============================================================
// Sprouts — a simple two-player game
// Rules: https://www.gamesforyoungminds.com/blog/2019/9/26/sprouts
// ============================================================
 
const MAX_CONNECTIONS = 3;
 
// --- Screen elements ---
const homeScreen = document.getElementById("home-screen");
const gameScreen = document.getElementById("game-screen");
const startBtn = document.getElementById("start-btn");
const backBtn = document.getElementById("back-btn");
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const turnLabel = document.getElementById("turn-label");
const statusLabel = document.getElementById("status-label");
const helpText = document.getElementById("help-text");
 
// --- Game state ---
let dots = [];       // { id, x, y, connections, owner: 'start' | 1 | 2 }
let edges = [];      // { id, dotA, dotB, points: [{x,y}, ...] }
let currentPlayer = 1;
let nextId = 0;
 
// Drawing state
let dragStartDot = null;
let dragPoints = [];
let awaitingDotPlacement = false;  // true after drawing a line, until a dot is placed
 
startBtn.addEventListener("click", startGame);
backBtn.addEventListener("click", showHome);
canvas.addEventListener("mousedown", onMouseDown);
canvas.addEventListener("mousemove", onMouseMove);
canvas.addEventListener("mouseup", onMouseUp);
canvas.addEventListener("click", onCanvasClick);
 
// --- Screen switching ---
 
function showHome() {
  homeScreen.classList.remove("hidden");
  gameScreen.classList.add("hidden");
}
 
function startGame() {
  homeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  resetGame();
}
 
function resetGame() {
  dots = [];
  edges = [];
  currentPlayer = 1;
  nextId = 0;
  dragStartDot = null;
  dragPoints = [];
  awaitingDotPlacement = false;
 
  // Three starting dots spread across the canvas
  addDot(200, 250, "start");
  addDot(400, 150, "start");
  addDot(600, 350, "start");
 
  updateUI();
  draw();
}
 
function addDot(x, y, owner) {
  const dot = { id: nextId++, x, y, connections: 0, owner };
  dots.push(dot);
  return dot;
}
 
// --- UI updates ---
 
function updateUI() {
  if (awaitingDotPlacement) {
    turnLabel.textContent = `Player ${currentPlayer}'s turn`;
    statusLabel.textContent = "Click on any line to place a new dot.";
    helpText.textContent = "Click anywhere along any line on the board.";
    return;
  }
 
  turnLabel.textContent = `Player ${currentPlayer}'s turn`;
  turnLabel.style.color = currentPlayer === 1 ? "#2563eb" : "#dc2626";
 
  const canMove = hasValidMove();
  if (!canMove) {
    const winner = currentPlayer === 1 ? 2 : 1;
    statusLabel.textContent = `No valid moves! Player ${winner} wins!`;
    helpText.textContent = "Game over. Click \"Back to rules\" to play again.";
  } else {
    statusLabel.textContent = "";
    helpText.textContent =
      "Drag from one dot to another, then click any line to place a new dot.";
  }
}
 
function dotColor(dot) {
  if (dot.owner === "start") return "#7c3aed";
  if (dot.owner === 1) return "#2563eb";
  return "#dc2626";
}
 
// --- Drawing ---
 
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
 
  // Draw all edges (highlighted while waiting for dot placement)
  for (const edge of edges) {
    const color = awaitingDotPlacement ? "#2563eb" : "#334155";
    const width = awaitingDotPlacement ? 3 : 2;
    drawPath(edge.points, color, width);
  }
 
  // Draw the line currently being dragged
  if (dragStartDot && dragPoints.length > 1) {
    drawPath(dragPoints, "#93c5fd", 2, true);
  }
 
  // Draw all dots
  for (const dot of dots) {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = dotColor(dot);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
 
    // Show connection count (helps learn the rules)
    ctx.fillStyle = "#fff";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${dot.connections}/${MAX_CONNECTIONS}`, dot.x, dot.y + 4);
  }
}
 
function drawPath(points, color, width, dashed) {
  if (points.length < 2) return;
 
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dashed) ctx.setLineDash([6, 4]);
  else ctx.setLineDash([]);
  ctx.stroke();
  ctx.setLineDash([]);
}
 
// --- Mouse helpers ---
 
function getMousePos(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}
 
function findDotAt(x, y) {
  const hitRadius = 18;
  for (let i = dots.length - 1; i >= 0; i--) {
    const dot = dots[i];
    const dx = x - dot.x;
    const dy = y - dot.y;
    if (dx * dx + dy * dy <= hitRadius * hitRadius) {
      return dot;
    }
  }
  return null;
}
 
// --- Game logic: moves and validation ---
 
function canConnect(fromDot, toDot) {
  const isLoop = fromDot.id === toDot.id;
 
  if (isLoop) {
    // A self-loop uses 2 connection slots on that dot
    return fromDot.connections <= MAX_CONNECTIONS - 2;
  }
 
  return (
    fromDot.connections < MAX_CONNECTIONS &&
    toDot.connections < MAX_CONNECTIONS
  );
}
 
// sharedPoints = coordinates where pathA and pathB are *allowed* to touch
// (i.e. actual shared dots between the two paths being compared). Any other
// intersection is illegal, even if it happens to land near some unrelated
// point on either path.
function pathsCross(pathA, pathB, sharedPoints = []) {
  for (let i = 0; i < pathA.length - 1; i++) {
    for (let j = 0; j < pathB.length - 1; j++) {
      if (
        segmentsCrossIllegally(
          pathA[i],
          pathA[i + 1],
          pathB[j],
          pathB[j + 1],
          sharedPoints
        )
      ) {
        return true;
      }
    }
  }
  return false;
}
 
// A path illegally crosses itself (important for loops)
function pathSelfCrosses(path, sharedPoints = []) {
  for (let i = 0; i < path.length - 1; i++) {
    // Skip adjacent segments — they always share a point
    for (let j = i + 2; j < path.length - 1; j++) {
      if (
        segmentsCrossIllegally(
          path[i],
          path[i + 1],
          path[j],
          path[j + 1],
          sharedPoints
        )
      ) {
        return true;
      }
    }
  }
  return false;
}
 
function samePoint(a, b) {
  return Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
}
 
const INTERSECTION_EPS = 2;
 
// Lines may meet at a genuinely shared dot, but cannot cross anywhere else —
// including near an unrelated dot that neither path actually terminates at.
function segmentsCrossIllegally(a, b, c, d, sharedPoints = []) {
  if (!segmentsIntersect(a, b, c, d)) return false;
 
  const point = segmentIntersectionPoint(a, b, c, d);
  if (!point) return false;
 
  const atSharedDot = sharedPoints.some(
    (p) => distance(point, p) < INTERSECTION_EPS
  );
 
  return !atSharedDot;
}
 
function segmentIntersectionPoint(a, b, c, d) {
  const denom = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (Math.abs(denom) < 0.0001) return null;
 
  const t =
    ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / denom;
  const u =
    ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / denom;
 
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
 
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}
 
// Line segment intersection (standard math)
function segmentsIntersect(a, b, c, d) {
  function cross(o, p, q) {
    return (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  }
 
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
 
  if (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  ) {
    return true;
  }
  return false;
}
 
// Coordinates of dots that are genuinely shared between two node pairs.
// Used so we only forgive a crossing when it happens at a dot the two
// paths actually have in common — never at some other, unrelated dot.
function getSharedDotPoints(a1, b1, a2, b2) {
  const shared = [];
  for (const d of [a1, b1]) {
    for (const d2 of [a2, b2]) {
      if (d.id === d2.id) {
        shared.push({ x: d.x, y: d.y });
      }
    }
  }
  return shared;
}
 
// A line is also illegal if it passes through/over any dot other than its
// own two endpoints — even if that dot has no edges attached (so there'd be
// no line segment there to catch it via pathsCross).
function pathHitsForeignDot(path, dotA, dotB) {
  const DOT_RADIUS = 15;
  for (const dot of dots) {
    if (dot.id === dotA.id || dot.id === dotB.id) continue;
    for (let i = 0; i < path.length - 1; i++) {
      const projected = projectOntoSegment(dot, path[i], path[i + 1]);
      if (distance(projected, dot) < DOT_RADIUS) {
        return true;
      }
    }
  }
  return false;
}
 
function isValidNewPath(points, dotA, dotB) {
  const isLoop = dotA.id === dotB.id;
  const testPath = preparePathForValidation(points, isLoop);
 
  // For a loop, the only point it's allowed to touch itself at is its own
  // start/end dot.
  const selfSharedPoints = isLoop ? [{ x: dotA.x, y: dotA.y }] : [];
  if (pathSelfCrosses(testPath, selfSharedPoints)) return false;
 
  // The new line can't pass through any other dot on the board.
  if (pathHitsForeignDot(testPath, dotA, dotB)) return false;
 
  for (const edge of edges) {
    const edgeIsLoop = edge.dotA.id === edge.dotB.id;
    const edgePath = preparePathForValidation(edge.points, edgeIsLoop);
 
    // Only the dot(s) this new line and this edge actually have in common
    // are legal touch points — not just "near some endpoint".
    const sharedPoints = getSharedDotPoints(
      dotA,
      dotB,
      edge.dotA,
      edge.dotB
    );
 
    if (pathsCross(testPath, edgePath, sharedPoints)) return false;
  }
  return true;
}
 
// Remove redundant mouse points so validation is consistent every draw
function simplifyPath(points, minDist = 4) {
  if (points.length < 2) return points.slice();
 
  const simplified = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    if (distance(points[i], simplified[simplified.length - 1]) >= minDist) {
      simplified.push(points[i]);
    }
  }
 
  const last = points[points.length - 1];
  if (!samePoint(simplified[simplified.length - 1], last)) {
    simplified.push(last);
  }
  return simplified;
}
 
// Loops often pick up extra points while the cursor sits on the start dot
function trimLoopTail(points) {
  const trimmed = points.slice();
  const home = trimmed[0];
 
  while (trimmed.length > 3) {
    const candidate = trimmed[trimmed.length - 2];
    if (distance(candidate, home) < 18) {
      trimmed.splice(trimmed.length - 2, 1);
    } else {
      break;
    }
  }
 
  return trimmed;
}
 
// Add points along each segment so crossings are not missed between mouse samples
function densifyPath(points, spacing = 6) {
  if (points.length < 2) return points.slice();
 
  const dense = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = distance(a, b);
    const steps = Math.max(1, Math.floor(len / spacing));
 
    for (let s = 1; s <= steps; s++) {
      const t = s / (steps + 1);
      dense.push({
        x: a.x + t * (b.x - a.x),
        y: a.y + t * (b.y - a.y),
      });
    }
    dense.push(b);
  }
  return dense;
}
 
function preparePathForValidation(points, isLoop) {
  let path = simplifyPath(points);
  if (isLoop) path = trimLoopTail(path);
  return densifyPath(path);
}
 
function hasValidMove() {
  for (const a of dots) {
    for (const b of dots) {
      if (canConnect(a, b)) return true;
    }
  }
  return false;
}
 
function isGameOver() {
  return !hasValidMove();
}
 
// --- Mouse event handlers ---
 
function onMouseDown(event) {
  if (awaitingDotPlacement || isGameOver()) return;
 
  const pos = getMousePos(event);
  const dot = findDotAt(pos.x, pos.y);
  if (!dot) return;
 
  dragStartDot = dot;
  dragPoints = [{ x: dot.x, y: dot.y }];
}
 
function onMouseMove(event) {
  if (!dragStartDot) return;
 
  const pos = getMousePos(event);
  dragPoints.push({ x: pos.x, y: pos.y });
  draw();
}
 
function onMouseUp(event) {
  if (!dragStartDot) return;
 
  const pos = getMousePos(event);
  const endDot = findDotAt(pos.x, pos.y);
  let rejectedLine = false;
 
  // Make sure the path ends on a valid target dot
  if (endDot && canConnect(dragStartDot, endDot)) {
    // Snap the last point to the target dot
    dragPoints.push({ x: endDot.x, y: endDot.y });
 
    if (isValidNewPath(dragPoints, dragStartDot, endDot)) {
      const dotA = dragStartDot;
      const dotB = endDot;
      const isLoop = dotA.id === dotB.id;
 
      edges.push({
        id: nextId++,
        dotA,
        dotB,
        points: [...dragPoints],
      });
 
      if (isLoop) {
        dotA.connections += 2;
      } else {
        dotA.connections += 1;
        dotB.connections += 1;
      }
 
      awaitingDotPlacement = true;
    } else {
      rejectedLine = true;
    }
  }
 
  dragStartDot = null;
  dragPoints = [];
  updateUI();
  if (rejectedLine) {
    statusLabel.textContent = "Invalid line — it cannot cross another line.";
  }
  draw();
}
 
function findEdgeAt(x, y, maxDist = 15) {
  let bestEdge = null;
  let bestPoint = null;
  let bestDist = maxDist;
 
  for (const edge of edges) {
    const closest = closestPointOnPath(edge.points, { x, y });
    const dist = distance({ x, y }, closest);
    if (dist < bestDist) {
      bestDist = dist;
      bestEdge = edge;
      bestPoint = closest;
    }
  }
 
  return bestEdge ? { edge: bestEdge, point: bestPoint } : null;
}
 
function onCanvasClick(event) {
  if (!awaitingDotPlacement) return;
 
  const pos = getMousePos(event);
  const hit = findEdgeAt(pos.x, pos.y);
  if (!hit) return;
 
  const { edge, point } = hit;
 
  // Don't place a dot too close to the endpoints
  const distA = distance(point, edge.dotA);
  const distB = distance(point, edge.dotB);
  if (distA < 25 || distB < 25) return;
 
  finishMove(edge, point);
}
 
function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
 
// Find the closest point on a path to a click position
function closestPointOnPath(points, click) {
  let best = points[0];
  let bestDist = Infinity;
 
  for (let i = 0; i < points.length - 1; i++) {
    const projected = projectOntoSegment(click, points[i], points[i + 1]);
    const dist = distance(click, projected);
    if (dist < bestDist) {
      bestDist = dist;
      best = projected;
    }
  }
  return best;
}
 
function projectOntoSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: a.x, y: a.y };
 
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * dx, y: a.y + t * dy };
}
 
// Split the chosen edge at the new dot and finish the turn
function finishMove(edge, newDotPos) {
  const { dotA, dotB, points } = edge;
 
  // Replace the old edge with two segments split at the new dot
  edges = edges.filter((e) => e.id !== edge.id);
  const { pathA, pathB } = splitPathAtPoint(points, newDotPos);
 
  const newDot = addDot(newDotPos.x, newDotPos.y, currentPlayer);
  edges.push({ id: nextId++, dotA, dotB: newDot, points: pathA });
  edges.push({ id: nextId++, dotA: newDot, dotB, points: pathB });
 
  newDot.connections = 2;
  awaitingDotPlacement = false;
 
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updateUI();
  draw();
}
 
function splitPathAtPoint(points, target) {
  let bestIndex = 0;
  let bestDist = Infinity;
  let bestPoint = points[0];
 
  for (let i = 0; i < points.length - 1; i++) {
    const projected = projectOntoSegment(target, points[i], points[i + 1]);
    const dist = distance(target, projected);
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
      bestPoint = projected;
    }
  }
 
  const pathA = points.slice(0, bestIndex + 1);
  pathA.push({ x: bestPoint.x, y: bestPoint.y });
 
  const pathB = [{ x: bestPoint.x, y: bestPoint.y }];
  pathB.push(...points.slice(bestIndex + 1));
 
  return { pathA, pathB };
}