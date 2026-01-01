"""
Thumbnail Recreation Service

Orchestrates the thumbnail recreation flow:
1. Download reference thumbnail
2. Process user's face image
3. Build recreation prompt from analysis
4. Create generation job
5. Queue for Nano Banana
"""

import logging
import base64
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from uuid import uuid4

from backend.database.supabase_client import get_supabase_client
from backend.services.generation_service import get_generation_service
from backend.services.brand_kit_service import get_brand_kit_service
from backend.api.schemas.thumbnail_intel import ThumbnailAnalysisResponse

logger = logging.getLogger(__name__)


class ThumbnailRecreateService:
    """
    Service for recreating thumbnails with user's face.
    
    Takes a reference thumbnail analysis and user's face image,
    builds a recreation prompt, and queues generation.
    """
    
    def __init__(self):
        self._supabase = None
        self._generation_service = None
        self._brand_kit_service = None
    
    @property
    def db(self):
        """Lazy-load Supabase client."""
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    @property
    def generation_service(self):
        """Lazy-load generation service."""
        if self._generation_service is None:
            self._generation_service = get_generation_service()
        return self._generation_service
    
    @property
    def brand_kit_service(self):
        """Lazy-load brand kit service."""
        if self._brand_kit_service is None:
            self._brand_kit_service = get_brand_kit_service()
        return self._brand_kit_service
    
    async def recreate(
        self,
        user_id: str,
        video_id: str,
        thumbnail_url: str,
        analysis: ThumbnailAnalysisResponse,
        face_image_base64: Optional[str] = None,
        face_asset_id: Optional[str] = None,
        custom_text: Optional[str] = None,
        use_brand_colors: bool = False,
        brand_kit_id: Optional[str] = None,
        additional_instructions: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Recreate a thumbnail with user's face.
        
        Args:
            user_id: Authenticated user's ID
            video_id: YouTube video ID of reference
            thumbnail_url: URL of reference thumbnail
            analysis: Pre-analyzed thumbnail data
            face_image_base64: New face upload (base64)
            face_asset_id: Saved face asset ID
            custom_text: Custom text override
            use_brand_colors: Use brand kit colors
            brand_kit_id: Brand kit ID if using brand colors
            additional_instructions: Extra generation instructions
            
        Returns:
            Dict with recreation_id, job_id, status
        """
        recreation_id = str(uuid4())
        
        try:
            # 1. Get face image
            face_data = await self._get_face_data(
                user_id, 
                face_image_base64, 
                face_asset_id
            )
            
            # 2. Get brand colors if requested
            brand_colors = None
            if use_brand_colors and brand_kit_id:
                brand_kit = await self.brand_kit_service.get(user_id, brand_kit_id)
                if brand_kit:
                    brand_colors = brand_kit.primary_colors + brand_kit.accent_colors
            
            # 3. Build recreation prompt
            prompt = self._build_recreation_prompt(
                analysis=analysis,
                custom_text=custom_text,
                brand_colors=brand_colors,
                additional_instructions=additional_instructions,
            )
            
            # 4. Create generation job with reference image
            job = await self.generation_service.create_job(
                user_id=user_id,
                brand_kit_id=brand_kit_id,
                asset_type="thumbnail",
                custom_prompt=prompt,
                parameters={
                    "recreation_mode": True,
                    "reference_thumbnail_url": thumbnail_url,
                    "reference_video_id": video_id,
                    "face_image_base64": face_data.get("base64") if face_data else None,
                    "recreation_id": recreation_id,
                },
            )
            
            # 5. Enqueue job for background processing
            from backend.workers.generation_worker import enqueue_generation_job
            enqueue_generation_job(job.id, user_id)
            
            # 6. Save recreation record
            await self._save_recreation_record(
                recreation_id=recreation_id,
                user_id=user_id,
                job_id=job.id,
                video_id=video_id,
                thumbnail_url=thumbnail_url,
                analysis=analysis,
                custom_text=custom_text,
                use_brand_colors=use_brand_colors,
                brand_kit_id=brand_kit_id,
            )
            
            logger.info(f"Recreation started: {recreation_id} for user {user_id}, job enqueued")
            
            return {
                "recreation_id": recreation_id,
                "job_id": job.id,
                "status": "queued",
                "estimated_seconds": 30,
                "message": "Recreation started - your thumbnail is being generated",
            }
            
        except Exception as e:
            logger.error(f"Recreation failed: {e}")
            raise
    
    async def get_status(
        self,
        user_id: str,
        recreation_id: str,
    ) -> Dict[str, Any]:
        """
        Get status of a recreation.
        
        Args:
            user_id: Authenticated user's ID
            recreation_id: Recreation ID
            
        Returns:
            Status dict with progress and result
        """
        # Get recreation record
        result = self.db.table("thumbnail_recreations") \
            .select("*") \
            .eq("id", recreation_id) \
            .eq("user_id", user_id) \
            .execute()
        
        if not result.data:
            raise ValueError(f"Recreation not found: {recreation_id}")
        
        record = result.data[0]
        job_id = record["job_id"]
        
        # Get job status
        job = await self.generation_service.get_job(user_id, job_id)
        
        response = {
            "recreation_id": recreation_id,
            "job_id": job_id,
            "status": job.status.value,
            "progress_percent": job.progress,
        }
        
        if job.status.value == "completed":
            # Get generated asset
            assets = await self.generation_service.get_job_assets(user_id, job_id)
            if assets:
                asset = assets[0]
                response["generated_thumbnail_url"] = asset.url
                response["download_url"] = asset.url
                response["asset_id"] = asset.id
                
                # Update recreation record
                self.db.table("thumbnail_recreations") \
                    .update({
                        "generated_url": asset.url,
                        "asset_id": asset.id,
                        "status": "completed",
                    }) \
                    .eq("id", recreation_id) \
                    .execute()
        
        elif job.status.value == "failed":
            response["error_message"] = job.error_message
            
            # Update recreation record
            self.db.table("thumbnail_recreations") \
                .update({"status": "failed"}) \
                .eq("id", recreation_id) \
                .execute()
        
        return response
    
    async def get_history(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Get user's recreation history.
        
        Args:
            user_id: Authenticated user's ID
            limit: Max results
            offset: Pagination offset
            
        Returns:
            Dict with recreations list and total
        """
        result = self.db.table("thumbnail_recreations") \
            .select("*", count="exact") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()
        
        recreations = [
            {
                "id": r["id"],
                "reference_video_id": r["reference_video_id"],
                "reference_thumbnail_url": r["reference_thumbnail_url"],
                "generated_thumbnail_url": r.get("generated_url"),
                "custom_text": r.get("custom_text"),
                "status": r["status"],
                "created_at": r["created_at"],
            }
            for r in result.data
        ]
        
        return {
            "recreations": recreations,
            "total": result.count or len(recreations),
        }
    
    async def _get_face_data(
        self,
        user_id: str,
        face_image_base64: Optional[str],
        face_asset_id: Optional[str],
    ) -> Optional[Dict[str, Any]]:
        """Get face image data from upload or saved asset."""
        
        if face_image_base64:
            # New upload - return as-is
            return {"base64": face_image_base64, "source": "upload"}
        
        if face_asset_id:
            # Load from saved assets
            result = self.db.table("user_face_assets") \
                .select("*") \
                .eq("id", face_asset_id) \
                .eq("user_id", user_id) \
                .execute()
            
            if result.data:
                asset = result.data[0]
                # Download and convert to base64
                url = asset.get("processed_url") or asset.get("original_url")
                if url:
                    async with httpx.AsyncClient() as client:
                        response = await client.get(url)
                        if response.status_code == 200:
                            return {
                                "base64": base64.b64encode(response.content).decode(),
                                "source": "saved",
                                "asset_id": face_asset_id,
                            }
        
        return None
    
    def _build_recreation_prompt(
        self,
        analysis: ThumbnailAnalysisResponse,
        custom_text: Optional[str] = None,
        brand_colors: Optional[list] = None,
        additional_instructions: Optional[str] = None,
    ) -> str:
        """
        Build the recreation prompt from analysis data.
        
        This prompt instructs Nano Banana to recreate the thumbnail
        while swapping the face with the user's face.
        """
        # Determine text to use
        text_content = custom_text or analysis.text_content or ""
        
        # Determine colors to use
        colors = brand_colors or analysis.dominant_colors
        colors_str = ", ".join(colors[:5]) if colors else "original colors"
        
        # Build face instruction if face was detected
        face_instruction = ""
        if analysis.has_face:
            expression = analysis.face_expression or "expressive"
            position = analysis.face_position or "prominent"
            size = analysis.face_size or "medium"
            looking = analysis.face_looking_direction or "camera"
            
            face_instruction = f"""
FACE REPLACEMENT INSTRUCTIONS:
- Replace the original face with the provided user face image
- Match the {expression} expression from the original
- Position the face in the {position} area of the frame
- Face size should be {size} relative to the thumbnail
- Face should be looking {looking}
- Maintain the same lighting and color grading on the face
- Blend the face naturally with the background and composition
"""
        
        # Build the full prompt
        prompt = f"""THUMBNAIL RECREATION MODE - USE THE ATTACHED REFERENCE IMAGE

You are recreating the attached YouTube thumbnail. The reference image is provided as input.
COPY THE EXACT LAYOUT, COMPOSITION, AND STYLE from the reference image.

CRITICAL: Look at the attached reference image and recreate it with these modifications:

REFERENCE THUMBNAIL ANALYSIS:
- Layout: {analysis.layout_type}
- Layout Recipe: {analysis.layout_recipe}
- Focal Point: {analysis.focal_point}
- Text Placement: {analysis.text_placement}
- Background Style: {analysis.background_style}
- Color Mood: {analysis.color_mood}
- Color Recipe: {analysis.color_recipe}

COLORS TO USE: {colors_str}

DESIGN ELEMENTS TO COPY FROM REFERENCE:
- Has Border: {analysis.has_border}
- Has Glow Effects: {analysis.has_glow_effects}
- Has Arrows/Circles: {analysis.has_arrows_circles}
{face_instruction}
TEXT CONTENT: "{text_content}"
- Place text at: {analysis.text_placement}
- Use bold, readable font
- Apply appropriate effects (glow, shadow, outline) to match style

WHY THIS WORKS: {analysis.why_it_works}

RECREATION INSTRUCTIONS:
1. LOOK AT THE REFERENCE IMAGE - copy its exact composition and layout
2. Recreate the same visual style, effects, and mood
3. Use the specified color palette
4. If a face is provided, swap it in while maintaining the original expression and position
5. Apply the same visual effects (glow, borders, etc.) visible in the reference
6. Ensure text is prominent and readable
7. Output dimensions: 1280x720 (YouTube thumbnail)
8. Make it look professional and click-worthy - MATCH THE REFERENCE QUALITY

{additional_instructions or ""}

Generate a thumbnail that CLOSELY MATCHES the reference image while incorporating any requested changes."""

        return prompt
    
    async def _save_recreation_record(
        self,
        recreation_id: str,
        user_id: str,
        job_id: str,
        video_id: str,
        thumbnail_url: str,
        analysis: ThumbnailAnalysisResponse,
        custom_text: Optional[str],
        use_brand_colors: bool,
        brand_kit_id: Optional[str],
    ) -> None:
        """Save recreation record to database."""
        
        now = datetime.now(timezone.utc).isoformat()
        
        data = {
            "id": recreation_id,
            "user_id": user_id,
            "job_id": job_id,
            "reference_video_id": video_id,
            "reference_thumbnail_url": thumbnail_url,
            "reference_analysis": analysis.model_dump(),
            "custom_text": custom_text,
            "use_brand_colors": use_brand_colors,
            "brand_kit_id": brand_kit_id,
            "status": "queued",
            "created_at": now,
        }
        
        self.db.table("thumbnail_recreations").insert(data).execute()


# Singleton instance
_service: Optional[ThumbnailRecreateService] = None


def get_thumbnail_recreate_service() -> ThumbnailRecreateService:
    """Get or create the recreation service singleton."""
    global _service
    if _service is None:
        _service = ThumbnailRecreateService()
    return _service
