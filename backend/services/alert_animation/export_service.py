"""
Server-side animation export using FFmpeg.

Used as fallback for browsers that don't support WebM alpha (Safari, mobile).
Most exports happen client-side using MediaRecorder API.
"""

import asyncio
import logging
import tempfile
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from pathlib import Path
from typing import Optional
from PIL import Image
import numpy as np
import math

from backend.services.storage_service import get_storage_service

logger = logging.getLogger(__name__)

# Thread pool for CPU-bound operations
_executor = ThreadPoolExecutor(max_workers=2)


async def run_in_executor(func, *args, **kwargs):
    """Run a sync function in a thread pool executor."""
    loop = asyncio.get_event_loop()
    if kwargs:
        func = partial(func, **kwargs)
    return await loop.run_in_executor(_executor, func, *args)


class AnimationExportService:
    """
    Generates animated exports (WebM/GIF) server-side using FFmpeg.
    """
    
    def __init__(self):
        self.storage = get_storage_service()
    
    async def export_animation(
        self,
        project_id: str,
        user_id: str,
        source_url: str,
        depth_map_url: Optional[str],
        animation_config: dict,
        format: str,
        width: int,
        height: int,
        fps: int,
        duration_ms: int,
    ) -> dict:
        """
        Generate animation export server-side.
        
        1. Download source and depth map
        2. Generate frames using Pillow/numpy
        3. Encode with FFmpeg
        4. Upload to storage
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            
            # Download assets
            source_path = tmpdir / "source.png"
            await self._download_image(source_url, source_path)
            
            depth_path = None
            if depth_map_url:
                depth_path = tmpdir / "depth.png"
                await self._download_image(depth_map_url, depth_path)
            
            # Generate frames
            frames_dir = tmpdir / "frames"
            frames_dir.mkdir()
            
            num_frames = int((duration_ms / 1000) * fps)
            await run_in_executor(
                self._generate_frames,
                source_path,
                depth_path,
                animation_config,
                frames_dir,
                num_frames,
                width,
                height,
            )
            
            # Encode with FFmpeg
            output_path = tmpdir / f"output.{format}"
            await self._encode_video(
                frames_dir,
                output_path,
                format,
                fps,
                width,
                height,
            )
            
            # Upload to storage
            with open(output_path, "rb") as f:
                data = f.read()
            
            storage_path = f"{user_id}/animations/{project_id}/export.{format}"
            result = await self.storage.upload_raw(
                path=storage_path,
                data=data,
                content_type=f"video/{format}" if format == "webm" else f"image/{format}",
            )
            
            return {
                "url": result["url"],
                "storage_path": result["path"],
                "file_size": len(data),
                "format": format,
            }
    
    def _generate_frames(
        self,
        source_path: Path,
        depth_path: Optional[Path],
        config: dict,
        output_dir: Path,
        num_frames: int,
        width: int,
        height: int,
    ) -> None:
        """Generate animation frames (CPU-bound, runs in thread pool)."""
        source = Image.open(source_path).convert("RGBA")
        source = source.resize((width, height), Image.Resampling.LANCZOS)
        
        depth = None
        if depth_path and depth_path.exists():
            depth = Image.open(depth_path).convert("L")
            depth = depth.resize((width, height), Image.Resampling.LANCZOS)
            depth = np.array(depth) / 255.0
        
        for i in range(num_frames):
            t = i / max(num_frames - 1, 1)  # Normalized time 0-1
            frame = self._render_frame(source, depth, config, t, width, height)
            frame.save(output_dir / f"frame_{i:05d}.png")
    
    def _render_frame(
        self,
        source: Image.Image,
        depth: Optional[np.ndarray],
        config: dict,
        t: float,
        width: int,
        height: int,
    ) -> Image.Image:
        """Render a single animation frame."""
        frame = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        
        # Start with source
        img = source.copy()
        
        # Apply entry animation
        entry = config.get("entry")
        entry_duration = (entry.get("duration_ms", 500) if entry else 500) / (config.get("duration_ms", 3000))
        
        if entry and t < entry_duration:
            entry_t = t / entry_duration  # Normalize to entry duration
            img = self._apply_entry(img, entry, entry_t, width, height)
        
        # Apply loop animation (after entry)
        loop = config.get("loop")
        if loop and t >= entry_duration:
            loop_t = (t - entry_duration) / (1 - entry_duration) if entry_duration < 1 else t
            img = self._apply_loop(img, loop, loop_t)
        
        # Composite onto frame (centered)
        x = (width - img.width) // 2
        y = (height - img.height) // 2
        frame.paste(img, (x, y), img)
        
        return frame
    
    def _apply_entry(
        self,
        img: Image.Image,
        entry: dict,
        t: float,
        width: int,
        height: int,
    ) -> Image.Image:
        """Apply entry animation to image."""
        entry_type = entry.get("type", "fade_in")
        
        # Ease out function
        eased_t = 1 - (1 - t) ** 2  # power2.out approximation
        
        if entry_type == "pop_in":
            scale_from = entry.get("scale_from", 0)
            scale = scale_from + (1 - scale_from) * eased_t
            if scale > 0:
                new_size = (int(img.width * scale), int(img.height * scale))
                if new_size[0] > 0 and new_size[1] > 0:
                    img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        elif entry_type == "fade_in":
            # Apply opacity fade using alpha channel
            if img.mode == "RGBA":
                r, g, b, a = img.split()
                a = a.point(lambda x: int(x * eased_t))
                img = Image.merge("RGBA", (r, g, b, a))
        
        elif entry_type == "slide_in":
            direction = entry.get("direction", "left")
            distance = entry.get("distance_percent", 120) / 100
            offset = int(width * distance * (1 - eased_t))
            
            if direction == "left":
                img = img.transform(img.size, Image.AFFINE, (1, 0, offset, 0, 1, 0))
            elif direction == "right":
                img = img.transform(img.size, Image.AFFINE, (1, 0, -offset, 0, 1, 0))
        
        return img
    
    def _apply_loop(
        self,
        img: Image.Image,
        loop: dict,
        t: float,
    ) -> Image.Image:
        """Apply loop animation to image."""
        loop_type = loop.get("type", "float")
        frequency = loop.get("frequency", 1.0)
        
        # Create oscillating value
        osc = math.sin(t * frequency * 2 * math.pi)
        
        if loop_type == "pulse":
            scale_min = loop.get("scale_min", 0.97)
            scale_max = loop.get("scale_max", 1.03)
            scale = scale_min + (scale_max - scale_min) * (osc + 1) / 2
            new_size = (int(img.width * scale), int(img.height * scale))
            if new_size[0] > 0 and new_size[1] > 0:
                img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        return img
    
    async def _encode_video(
        self,
        frames_dir: Path,
        output_path: Path,
        format: str,
        fps: int,
        width: int,
        height: int,
    ) -> None:
        """Encode frames to video using FFmpeg."""
        if format == "webm":
            cmd = [
                "ffmpeg", "-y",
                "-framerate", str(fps),
                "-i", str(frames_dir / "frame_%05d.png"),
                "-c:v", "libvpx",
                "-pix_fmt", "yuva420p",
                "-auto-alt-ref", "0",
                "-b:v", "5M",
                str(output_path),
            ]
        elif format == "gif":
            # Generate palette for better GIF quality
            palette_path = frames_dir / "palette.png"
            palette_cmd = [
                "ffmpeg", "-y",
                "-framerate", str(fps),
                "-i", str(frames_dir / "frame_%05d.png"),
                "-vf", f"fps={fps},scale={width}:{height}:flags=lanczos,palettegen=reserve_transparent=1",
                str(palette_path),
            ]
            
            process = await asyncio.create_subprocess_exec(
                *palette_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await process.communicate()
            
            cmd = [
                "ffmpeg", "-y",
                "-framerate", str(fps),
                "-i", str(frames_dir / "frame_%05d.png"),
                "-i", str(palette_path),
                "-lavfi", f"fps={fps},scale={width}:{height}:flags=lanczos[x];[x][1:v]paletteuse=alpha_threshold=128",
                str(output_path),
            ]
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            raise RuntimeError(f"FFmpeg failed: {stderr.decode()}")
    
    async def _download_image(self, url: str, path: Path) -> None:
        """Download image from URL to path."""
        import httpx
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30)
            response.raise_for_status()
            path.write_bytes(response.content)


# Singleton
_export_service: Optional[AnimationExportService] = None


def get_export_service() -> AnimationExportService:
    """Get singleton export service instance."""
    global _export_service
    if _export_service is None:
        _export_service = AnimationExportService()
    return _export_service


def generate_obs_html_blob(
    alert_id: str,
    alert_name: str,
    animation_config: dict,
    source_url: str,
    depth_map_url: Optional[str],
    width: int,
    height: int,
    debug: bool = False,
) -> str:
    """
    Generate self-contained HTML blob for OBS Browser Source.
    
    The generated HTML includes:
    - Embedded animation configuration
    - Minimal animation engine (placeholder - real implementation would bundle full engine)
    - SSE connection for receiving triggers
    - Debug overlay (optional)
    
    Args:
        alert_id: Unique identifier for the alert
        alert_name: Display name for the alert
        animation_config: Full animation configuration dict
        source_url: URL to the source image
        depth_map_url: Optional URL to the depth map
        width: Canvas width in pixels
        height: Canvas height in pixels
        debug: Whether to include debug overlay
        
    Returns:
        str: Complete HTML document as a string
    """
    import json
    
    config_json = json.dumps({
        "alertId": alert_id,
        "alertName": alert_name,
        "width": width,
        "height": height,
        "sourceUrl": source_url,
        "depthMapUrl": depth_map_url,
        "animationConfig": animation_config,
    }, indent=2)
    
    # Escape for embedding in HTML
    config_json_escaped = config_json.replace("</", "<\\/")
    
    debug_overlay = ""
    if debug:
        debug_overlay = """
    <div class="debug">
      <div id="debug-status">Debug Mode</div>
      <div id="debug-fps">FPS: --</div>
    </div>
    <style>
      .debug {
        position: fixed;
        bottom: 4px;
        right: 4px;
        font: 10px monospace;
        color: rgba(255,255,255,0.5);
        text-align: right;
      }
    </style>"""
    
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width={width}, height={height}">
  <title>{alert_name} - AuraStream Alert</title>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    html, body {{
      width: {width}px;
      height: {height}px;
      overflow: hidden;
      background: transparent;
    }}
    #canvas {{
      width: 100%;
      height: 100%;
      display: block;
    }}
    #alert-container {{
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    }}
    #alert-container.visible {{
      opacity: 1;
    }}
    #alert-image {{
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }}
  </style>
</head>
<body>
  <canvas id="canvas" width="{width}" height="{height}"></canvas>
  <div id="alert-container">
    <img id="alert-image" src="{source_url}" alt="{alert_name}">
  </div>
  {debug_overlay}
  
  <script>
    // AuraStream Alert Engine - Embedded Version
    // Generated: {alert_id}
    
    const CONFIG = {config_json_escaped};
    
    class AlertEngine {{
      constructor(config) {{
        this.config = config;
        this.canvas = null;
        this.ctx = null;
        this.isPlaying = false;
        this.animationFrame = null;
      }}
      
      init(canvasId) {{
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {{
          console.error('[AuraStream] Canvas not found:', canvasId);
          return false;
        }}
        this.ctx = this.canvas.getContext('2d');
        console.log('[AuraStream] Engine initialized for:', this.config.alertId);
        return true;
      }}
      
      async trigger() {{
        if (this.isPlaying) {{
          console.log('[AuraStream] Already playing, ignoring trigger');
          return;
        }}
        
        console.log('[AuraStream] Alert triggered!');
        this.isPlaying = true;
        
        const container = document.getElementById('alert-container');
        container.classList.add('visible');
        
        // Play animation based on config
        const duration = this.config.animationConfig?.duration_ms || 3000;
        
        // Simple animation loop
        const startTime = performance.now();
        const animate = (currentTime) => {{
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Apply entry animation (simplified)
          const entry = this.config.animationConfig?.entry;
          if (entry && progress < 0.3) {{
            const entryProgress = progress / 0.3;
            const scale = entry.scale_from + (1 - entry.scale_from) * this.easeOut(entryProgress);
            container.style.transform = `scale(${{scale}})`;
          }} else {{
            container.style.transform = 'scale(1)';
          }}
          
          // Apply loop animation (simplified)
          const loop = this.config.animationConfig?.loop;
          if (loop && progress >= 0.3) {{
            const loopProgress = (progress - 0.3) / 0.7;
            const frequency = loop.frequency || 1;
            const osc = Math.sin(loopProgress * frequency * Math.PI * 2);
            
            if (loop.type === 'pulse') {{
              const scaleMin = loop.scale_min || 0.97;
              const scaleMax = loop.scale_max || 1.03;
              const scale = scaleMin + (scaleMax - scaleMin) * (osc + 1) / 2;
              container.style.transform = `scale(${{scale}})`;
            }} else if (loop.type === 'float') {{
              const ampY = loop.amplitude_y || 10;
              container.style.transform = `translateY(${{osc * ampY}}px)`;
            }}
          }}
          
          if (progress < 1) {{
            this.animationFrame = requestAnimationFrame(animate);
          }} else {{
            this.stop();
          }}
        }};
        
        this.animationFrame = requestAnimationFrame(animate);
      }}
      
      stop() {{
        if (this.animationFrame) {{
          cancelAnimationFrame(this.animationFrame);
          this.animationFrame = null;
        }}
        
        const container = document.getElementById('alert-container');
        container.classList.remove('visible');
        container.style.transform = '';
        
        this.isPlaying = false;
        console.log('[AuraStream] Alert finished');
      }}
      
      easeOut(t) {{
        return 1 - Math.pow(1 - t, 2);
      }}
    }}
    
    // Initialize engine
    const engine = new AlertEngine(CONFIG);
    engine.init('canvas');
    
    // Expose for testing
    window.testAlert = () => engine.trigger();
    window.stopAlert = () => engine.stop();
    window.alertEngine = engine;
    
    console.log('[AuraStream] Alert ready:', CONFIG.alertId);
    console.log('[AuraStream] Test with: testAlert()');
  </script>
</body>
</html>'''
    
    return html
