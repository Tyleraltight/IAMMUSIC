# IAMMUSIC

一个黑胶唱片风格的网页音乐播放器。60 张唱片以 3D 透视的方式排列在屏幕上，点击就能播放，每首歌的旋转速度和波纹效果都会跟着 BPM 走。

![唱片画廊](screenshots/gallery.png)

## 长什么样

**主页** — 唱片像扑克牌一样斜着叠放，左右滚动切换，每张都有独特的封面。

![播放页](screenshots/player.png)

**播放页** — 点击任意唱片进入播放页，封面嵌在黑胶唱片中间，跟着节拍旋转，周围有音波纹路随音乐跳动。

![搜索](screenshots/search.png)

**搜索** — 点左上角 SEARCH 打开搜索框，输入歌名或歌手，从网易云音乐实时获取结果并播放。

## 功能

- **3D 唱片画廊** — 扇形透视排列，滚动时前后景深变化
- **实时流播放** — 不用下载，直接从网易云拉取音频流
- **BPM 驱动** — 唱片转速和波纹频率根据歌曲 BPM 自动调整，慢歌悠转，快歌飞转
- **搜索** — 内置搜索框，随时搜歌
- **播放模式** — 顺序 / 随机 / 循环，右下角一键切换
- **上一首 / 下一首** — 键盘左右方向键或点击按钮
- **STUDIO 页面** — 联系方式展示页

## 技术栈

| 层 | 用了什么 |
|---|---|
| 前端 | React + TypeScript + Tailwind CSS |
| 后端 | FastAPI（Python） |
| 音乐来源 | 网易云音乐（通过 musicdl 库） |
| 动画 | requestAnimationFrame + CSS |
| 音频分析 | Web Audio API（节拍检测） |

## 怎么跑起来

### 前置条件

- Node.js 18+
- Python 3.10+
- pip

### 1. 启动后端

```bash
cd backend
pip install -r requirements.txt
python main.py
```

后端默认跑在 `http://localhost:8000`。

### 2. 启动前端

```bash
pnpm install
pnpm dev
```

前端默认跑在 `http://localhost:5173`。

打开浏览器访问即可。

## 项目结构

```
vinyl-player/
├── src/
│   ├── App.tsx              # 主路由和状态管理
│   ├── components/
│   │   ├── AlbumGrid.tsx    # 3D 唱片画廊
│   │   ├── AlbumCard.tsx    # 单张唱片卡片
│   │   ├── PlayerView.tsx   # 播放页
│   │   ├── VinylDisc.tsx    # 黑胶唱片旋转动画
│   │   ├── SoundRipples.tsx # 音波纹路效果
│   │   ├── PlaybackControls.tsx  # 播放控制栏
│   │   ├── PlaybackMode.tsx     # 播放模式切换
│   │   ├── SearchBar.tsx    # 搜索功能
│   │   ├── NavHeader.tsx    # 顶部导航
│   │   └── StudioPage.tsx   # 联系方式页
│   ├── data/
│   │   └── albums.ts        # 60 张唱片数据
│   └── hooks/
│       └── useAudioPlayer.ts # 音频播放逻辑
├── backend/
│   ├── main.py              # FastAPI 服务
│   └── musicdl_service.py   # 网易云搜索/流媒体代理
└── public/
    └── covers/              # 本地封面图
```

## 作者

**Tyler** — [GitHub](https://github.com/Tyleraltight) · [Email](mailto:chuzihang456@gmail.com)
