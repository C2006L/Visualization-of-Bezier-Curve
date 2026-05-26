// ==========================================
// 1. 宇宙基础设施与状态档案
// ==========================================
const canvas = document.getElementById("galaxyCanvas");
const ctx = canvas.getContext("2d");
// 全局状态控制
let showHelperLines = true;

let controlStars = [
  { x: 200, y: 400, radius: 8, color: "#00ffff" },
  { x: 400, y: 150, radius: 8, color: "#00ffff" },
  { x: 700, y: 150, radius: 8, color: "#00ffff" },
  { x: 900, y: 400, radius: 8, color: "#00ffff" },
];

let backgroundStars = [];
for (let i = 0; i < 150; i++) {
  backgroundStars.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 1.5,
    alpha: Math.random(),
    twinkleSpeed: 0.02 + Math.random() * 0.03,
  });
}
let shootingStars = [];
let explosions = [];

// 【新增】：全局动画参数 t，用于驱动几何辅助线的运动
let globalT = 0;

// ==========================================
// 2. 核心数学：获取最终星轨坐标 (用于画那条固定的轨迹线)
// ==========================================
function getBezierPoint(points, t) {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return { x: points[0].x, y: points[0].y };
  let temp = points.map((p) => ({ x: p.x, y: p.y }));
  for (let k = 1; k < points.length; k++) {
    for (let i = 0; i < points.length - k; i++) {
      temp[i].x = (1 - t) * temp[i].x + t * temp[i + 1].x;
      temp[i].y = (1 - t) * temp[i].y + t * temp[i + 1].y;
    }
  }
  return temp[0];
}

// ==========================================
// 3. 【全新魔法】：解剖德卡斯特里奥的金字塔
// 这个函数会返回每一层降维插值的所有坐标点
// ==========================================
function getDeCasteljauPyramid(points, t) {
  if (points.length === 0) return [];
  let pyramid = [];

  // 底层（第 0 层）：原始控制点
  let currentLayer = points.map((p) => ({ x: p.x, y: p.y }));
  pyramid.push(currentLayer);

  // 逐层向上推导
  for (let k = 1; k < points.length; k++) {
    let nextLayer = [];
    for (let i = 0; i < currentLayer.length - 1; i++) {
      nextLayer.push({
        x: (1 - t) * currentLayer[i].x + t * currentLayer[i + 1].x,
        y: (1 - t) * currentLayer[i].y + t * currentLayer[i + 1].y,
      });
    }
    pyramid.push(nextLayer);
    currentLayer = nextLayer;
  }
  return pyramid;
}

// ==========================================
// 4. 宇宙渲染引擎 (辅助线“星空化”重制版)
// ==========================================
function animate() {
  // 4.1 刷深空背景
  let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#04030a");
  gradient.addColorStop(1, "#1b103a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 4.2 星空与流星背景动画
  backgroundStars.forEach((star) => {
    star.alpha += star.twinkleSpeed;
    if (star.alpha > 1 || star.alpha < 0.1) star.twinkleSpeed *= -1;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
    ctx.fill();
  });

  if (Math.random() < 0.03) {
    shootingStars.push({
      x: Math.random() * canvas.width,
      y: 0,
      len: 20 + Math.random() * 50,
      speedX: 5 + Math.random() * 5,
      speedY: 5 + Math.random() * 5,
      life: 1,
    });
  }
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    let ms = shootingStars[i];
    ctx.beginPath();
    ctx.moveTo(ms.x, ms.y);
    ctx.lineTo(ms.x - ms.len, ms.y - ms.len * (ms.speedY / ms.speedX));
    ctx.strokeStyle = `rgba(255, 255, 255, ${ms.life})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ms.x += ms.speedX;
    ms.y += ms.speedY;
    ms.life -= 0.02;
    if (ms.life <= 0) shootingStars.splice(i, 1);
  }

  for (let i = explosions.length - 1; i >= 0; i--) {
    let p = explosions[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.random() * 2 + 1, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.shadowBlur = 10;
    ctx.shadowColor = p.color;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;

    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.life -= 0.02;

    if (p.life <= 0) explosions.splice(i, 1);
  }

  // 4.3 绘制星轨和动态算法辅助线 (完美融合星空)
  if (controlStars.length >= 2) {
    // (1) 完整的紫粉色星轨轨迹底色
    ctx.beginPath();
    ctx.moveTo(controlStars[0].x, controlStars[0].y);
    for (let t = 0; t <= 1; t += 0.005) {
      let p = getBezierPoint(controlStars, t);
      ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = "rgba(196, 113, 237, 0.5)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // (2) 获取当前时间 t 下的算法金字塔
    let pyramid = getDeCasteljauPyramid(controlStars, globalT);

    if (showHelperLines) {
      for (let k = 0; k < pyramid.length - 1; k++) {
        let layerPoints = pyramid[k];

        ctx.beginPath();
        ctx.moveTo(layerPoints[0].x, layerPoints[0].y);
        for (let i = 1; i < layerPoints.length; i++) {
          ctx.lineTo(layerPoints[i].x, layerPoints[i].y);
        }

        let alpha = Math.max(0.2 - k * 0.04, 0.02);
        ctx.strokeStyle = `rgba(150, 220, 255, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        layerPoints.forEach((pt) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 240, 255, ${alpha + 0.2})`;
          ctx.shadowBlur = 5;
          ctx.shadowColor = "#00ffff";
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }
    }
    // (4) 【终极美学】：多层叠加渲染的"神话星舟"
    let finalPoint = pyramid[pyramid.length - 1][0];

    let nextT = Math.min(globalT + 0.001, 1);
    let nextPoint = getBezierPoint(controlStars, nextT);
    let dy = nextPoint.y - finalPoint.y;
    let dx = nextPoint.x - finalPoint.x;
    let angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(finalPoint.x, finalPoint.y);
    ctx.rotate(angle);

    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ff5e62";
    ctx.fillStyle = "rgba(255, 94, 98, 0.8)";
    ctx.beginPath();
    let flameLength = 12 + Math.random() * 6;
    let flameWidth = 2 + Math.random() * 1.5;
    ctx.ellipse(-10, 0, flameLength, flameWidth, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 20;
    ctx.shadowColor = "#00ffff";
    ctx.fillStyle = "rgba(0, 255, 255, 0.25)";
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.quadraticCurveTo(0, 12, -12, 6);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, -6);
    ctx.quadraticCurveTo(0, -12, 15, 0);
    ctx.fill();

    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-2, 3);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-2, -3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#c471ed";
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(2, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    globalT += 0.003;
    if (globalT > 1) globalT = 0;
  } else if (controlStars.length === 1) {
    ctx.beginPath();
    ctx.arc(controlStars[0].x, controlStars[0].y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }

  // 4.4 画主控制星星
  controlStars.forEach((star) => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.shadowBlur = 20;
    ctx.shadowColor = star.color;
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  requestAnimationFrame(animate);
}

// ==========================================
// 5. 交互：拖拽、增加 (双击) 与删除 (Shift+点击)
// ==========================================
let isDragging = false;
let draggedStarIndex = -1;

canvas.addEventListener("mousedown", function (event) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  for (let i = 0; i < controlStars.length; i++) {
    let dx = mouseX - controlStars[i].x;
    let dy = mouseY - controlStars[i].y;
    if (Math.sqrt(dx * dx + dy * dy) <= controlStars[i].radius + 10) {
      if (event.shiftKey) {
        let star = controlStars[i];
        for (let p = 0; p < 40; p++) {
          explosions.push({
            x: star.x,
            y: star.y,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            life: 1.0,
            color: Math.random() > 0.5 ? star.color : "#ffffff",
          });
        }
        controlStars.splice(i, 1);
        return;
      }
      isDragging = true;
      draggedStarIndex = i;
      break;
    }
  }
});

// 为了防止打结体验不好，给新加的星星初始位置做了微调
canvas.addEventListener("dblclick", function (event) {
  const rect = canvas.getBoundingClientRect();
  controlStars.push({
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    radius: 8,
    color: "#00ffff",
  });
});

canvas.addEventListener("mousemove", function (event) {
  if (isDragging && draggedStarIndex !== -1) {
    const rect = canvas.getBoundingClientRect();
    controlStars[draggedStarIndex].x = event.clientX - rect.left;
    controlStars[draggedStarIndex].y = event.clientY - rect.top;
  }
});

window.addEventListener("mouseup", function () {
  isDragging = false;
  draggedStarIndex = -1;
});

// 启动！
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();
animate();

// ==========================================
// 6. UI 控制面板交互
// ==========================================
document.getElementById("clearBtn").addEventListener("click", function () {
  controlStars = []; // 一键清空数组，宇宙归零
});

document.getElementById("toggleLines").addEventListener("change", function (e) {
  showHelperLines = e.target.checked; // 勾选框改变时，更新全局变量
});
