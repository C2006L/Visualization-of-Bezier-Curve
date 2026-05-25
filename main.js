// 1. 获取画布和画笔
const canvas = document.getElementById("galaxyCanvas");
const ctx = canvas.getContext("2d");

// 2. 准备我们的“宇宙数据”
// 4颗会发光的控制点（恒星）
let controlStars = [
  { x: 200, y: 400, radius: 8, color: "#00ffff" }, // 恒星1 (青色发光)
  { x: 400, y: 150, radius: 8, color: "#00ffff" }, // 恒星2
  { x: 700, y: 150, radius: 8, color: "#00ffff" }, // 恒星3
  { x: 900, y: 400, radius: 8, color: "#00ffff" }, // 恒星4
];

// 随机生成150颗背景小星星
let backgroundStars = [];
for (let i = 0; i < 150; i++) {
  backgroundStars.push({
    x: Math.random() * window.innerWidth, // 随机X坐标
    y: Math.random() * window.innerHeight, // 随机Y坐标
    r: Math.random() * 1.5, // 随机大小
    alpha: Math.random(), // 随机透明度
  });
}

// 3. 核心渲染函数（每次画面更新都要重新画一遍）
function render() {
  // 第一步：画深空渐变背景
  let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#020111");
  gradient.addColorStop(1, "#20124d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 第二步：画背景里的小星星
  backgroundStars.forEach((star) => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
    ctx.fill();
  });

  // ==========================================
  // 【新加入的魔法】：画星座连线和 Bezier 星轨
  // ==========================================

  // 2.1 画星座连线（控制多边形）
  ctx.beginPath();
  ctx.moveTo(controlStars[0].x, controlStars[0].y); // 起笔放在第一颗星
  for (let i = 1; i < 4; i++) {
    ctx.lineTo(controlStars[i].x, controlStars[i].y); // 连线到后面的星星
  }
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"; // 半透明白线
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]); // 开启虚线模式 [线长, 间距]
  ctx.stroke();
  ctx.setLineDash([]); // 赶紧关掉虚线模式，免得影响后面的画图

  // 2.2 画 Bezier 星轨（重头戏！）
  ctx.beginPath();
  ctx.moveTo(controlStars[0].x, controlStars[0].y); // 曲线从第一颗星开始

  // 让参数 t 从 0 一点点涨到 1
  for (let t = 0; t <= 1; t += 0.01) {
    let mt = 1 - t;
    let mt2 = mt * mt;
    let mt3 = mt2 * mt;
    let t2 = t * t;
    let t3 = t2 * t;

    // 提取 4 个控制点的坐标，方便下面写公式
    let p0 = controlStars[0];
    let p1 = controlStars[1];
    let p2 = controlStars[2];
    let p3 = controlStars[3];

    // 完美套用推导好的 X 和 Y 公式
    let x = mt3 * p0.x + 3 * t * mt2 * p1.x + 3 * t2 * mt * p2.x + t3 * p3.x;
    let y = mt3 * p0.y + 3 * t * mt2 * p1.y + 3 * t2 * mt * p2.y + t3 * p3.y;

    ctx.lineTo(x, y); // 把算出来的坐标连起来
  }

  // 给星轨上色并发光
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#c471ed"; // 紫粉色的光晕
  ctx.strokeStyle = "#ffffff"; // 星轨中心是亮的
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.shadowBlur = 0; // 关掉发光

  // ==========================================

  // 第三步：画我们的 4 颗“控制点恒星”（放在最后画，这样星星会盖在压住线上）
  controlStars.forEach((star) => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);

    ctx.shadowBlur = 20;
    ctx.shadowColor = star.color;
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

// 4. 动态调整画布尺寸
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // 如果窗口大小变了，背景星星的坐标也需要重新随机一下，防止越界
  backgroundStars.forEach((star) => {
    star.x = Math.random() * canvas.width;
    star.y = Math.random() * canvas.height;
  });

  render(); // 触发渲染
}

// 5. 初始化监听
window.addEventListener("resize", resizeCanvas);
resizeCanvas(); // 启动！
// ==========================================
// 6. 交互逻辑：让星星可以被拖拽
// ==========================================

// 记录当前状态的两个变量
let isDragging = false; // 记录鼠标是否正在拖拽
let draggedStarIndex = -1; // 记录我们当前抓到的是哪一颗星星（0, 1, 2, 3）

// 动作 1：鼠标按下（尝试抓取星星）
canvas.addEventListener("mousedown", function (event) {
  // 获取鼠标在玻璃板（Canvas）上的准确坐标
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  // 遍历我们的 4 颗主星，看看鼠标点中了哪一颗
  for (let i = 0; i < controlStars.length; i++) {
    let star = controlStars[i];

    // 核心数学：计算鼠标位置和星星圆心之间的距离（勾股定理）
    let dx = mouseX - star.x;
    let dy = mouseY - star.y;
    let distance = Math.sqrt(dx * dx + dy * dy);

    // 如果距离小于星星的半径（为了好点，我偷偷加了 10 像素的隐形判定区）
    if (distance <= star.radius + 10) {
      isDragging = true; // 标记为正在拖拽
      draggedStarIndex = i; // 记住抓到了第 i 颗星
      break; // 既然抓到了，就不找其他星星了，跳出循环
    }
  }
});

// 动作 2：鼠标移动（拖着星星跑）
canvas.addEventListener("mousemove", function (event) {
  // 只有在“正在拖拽”而且“确实抓到了星星”的情况下才执行
  if (isDragging && draggedStarIndex !== -1) {
    // 获取鼠标的新坐标
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // 把抓到的那颗星星的坐标，更新为鼠标的新坐标
    controlStars[draggedStarIndex].x = mouseX;
    controlStars[draggedStarIndex].y = mouseY;

    // 【关键】数据更新了，必须要重新画一遍！
    render();
  }
});

// 动作 3：鼠标松开（释放星星）
window.addEventListener("mouseup", function () {
  isDragging = false; // 取消拖拽状态
  draggedStarIndex = -1; // 手里没星星了
});
