"""Promo Service for Aurastream - handles promotional chatroom with Stripe payments."""

import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from uuid import uuid4

import aiohttp
import stripe
from backend.api.config import get_settings

logger = logging.getLogger(__name__)

PROMO_AMOUNT_CENTS = 100
RATE_LIMIT_MAX = 10
RATE_LIMIT_WINDOW = 3600
LINK_PREVIEW_CACHE_TTL = 86400


@dataclass
class UserBadges:
    is_king: bool = False
    is_top_10: bool = False
    rank: Optional[int] = None
    total_donated_cents: int = 0


@dataclass
class LinkPreview:
    url: str
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    site_name: Optional[str] = None


@dataclass
class PromoMessage:
    id: str
    user_id: str
    content: str
    link_url: Optional[str]
    link_preview: Optional[LinkPreview]
    is_pinned: bool
    reactions: Dict[str, int]
    created_at: datetime
    user_display_name: str
    user_avatar_url: Optional[str]
    badges: UserBadges


@dataclass
class LeaderboardEntry:
    user_id: str
    display_name: str
    avatar_url: Optional[str]
    total_donations_cents: int
    message_count: int
    rank: int
    is_king: bool


@dataclass
class LeaderboardResponse:
    top_10: List[LeaderboardEntry]
    user_entry: Optional[LeaderboardEntry]


class PromoError(Exception):
    def __init__(self, message: str, code: str, status_code: int = 400):
        self.message, self.code, self.status_code = message, code, status_code
        super().__init__(message)


class PromoRateLimitError(PromoError):
    def __init__(self, retry_after: int):
        super().__init__(f"Rate limit exceeded. Try again in {retry_after}s.", "PROMO_RATE_LIMITED", 429)
        self.retry_after = retry_after


class PromoMessageNotFoundError(PromoError):
    def __init__(self, message_id: str):
        super().__init__("Promo message not found", "PROMO_MESSAGE_NOT_FOUND", 404)
        self.message_id = message_id


class PromoMessageNotOwnedError(PromoError):
    def __init__(self, message_id: str):
        super().__init__("You don't own this message", "PROMO_MESSAGE_NOT_OWNED", 403)
        self.message_id = message_id


class PromoPaymentNotFoundError(PromoError):
    def __init__(self, checkout_session_id: str):
        super().__init__("Payment not found", "PROMO_PAYMENT_NOT_FOUND", 404)
        self.checkout_session_id = checkout_session_id


class PromoService:
    RATE_LIMIT_KEY_PREFIX = "promo:rate_limit:"
    LINK_PREVIEW_KEY_PREFIX = "promo:link_preview:"

    def __init__(self, supabase_client=None, redis_client=None):
        self._supabase, self._redis, self._settings = supabase_client, redis_client, None

    @property
    def db(self):
        if self._supabase is None:
            from backend.database.supabase_client import get_supabase_client
            self._supabase = get_supabase_client()
        return self._supabase

    @property
    def redis(self):
        if self._redis is None:
            from backend.database.redis_client import get_redis_client
            self._redis = get_redis_client()
        return self._redis

    @property
    def settings(self):
        if self._settings is None:
            self._settings = get_settings()
        return self._settings

    async def create_checkout_session(self, user_id: str, content: str, link_url: Optional[str],
                                       success_url: str, cancel_url: str) -> str:
        await self.check_rate_limit(user_id)
        stripe.api_key = self.settings.STRIPE_SECRET_KEY
        
        # Use pre-configured Stripe price for promo messages ($1.00)
        # Product: prod_Tgm4IEQyIRf5Zk | Price: price_1SjOVwDWmLUvSg8TSmoeJ30L
        session = stripe.checkout.Session.create(
            payment_method_types=["card"], mode="payment",
            success_url=success_url, cancel_url=cancel_url,
            metadata={"user_id": user_id, "type": "promo_message"},
            line_items=[{
                "price": "price_1SjOVwDWmLUvSg8TSmoeJ30L",
                "quantity": 1
            }])
        now = datetime.now(timezone.utc).isoformat()
        self.db.table("promo_payments").insert({
            "id": str(uuid4()), "user_id": user_id, "stripe_checkout_session_id": session.id,
            "amount_cents": PROMO_AMOUNT_CENTS, "status": "pending",
            "pending_content": content, "pending_link_url": link_url, "created_at": now}).execute()
        logger.info("Created promo checkout", extra={"user_id": user_id, "session_id": session.id})
        return session.url

    async def create_gift_message(self, user_id: str, content: str, link_url: Optional[str] = None) -> PromoMessage:
        """Create a promo message without payment - for dev/testing purposes."""
        now = datetime.now(timezone.utc).isoformat()
        
        # Create a "completed" payment record (simulating the gift)
        payment_id = str(uuid4())
        self.db.table("promo_payments").insert({
            "id": payment_id,
            "user_id": user_id,
            "stripe_checkout_session_id": f"gift_{uuid4()}",
            "stripe_payment_intent_id": f"gift_pi_{uuid4()}",
            "amount_cents": PROMO_AMOUNT_CENTS,
            "status": "completed",
            "pending_content": content,
            "pending_link_url": link_url,
            "created_at": now,
            "completed_at": now,
        }).execute()
        
        # Fetch link preview if URL provided
        lp = await self.fetch_link_preview(link_url) if link_url else None
        lp_dict = {"url": lp.url, "title": lp.title, "description": lp.description,
                   "image_url": lp.image_url, "site_name": lp.site_name} if lp else None
        
        # Create the message
        msg_data = {
            "id": str(uuid4()),
            "user_id": user_id,
            "payment_id": payment_id,
            "content": content,
            "link_url": link_url,
            "link_preview": lp_dict,
            "is_pinned": False,
            "reactions": {"fire": 0, "crown": 0, "heart": 0, "game": 0},
            "created_at": now,
        }
        self.db.table("promo_messages").insert(msg_data).execute()
        
        # Update leaderboard
        await self.recalculate_leaderboard()
        
        logger.info("Created gift promo message", extra={"user_id": user_id, "id": msg_data["id"]})
        return await self._map_message(msg_data)

    async def confirm_payment(self, checkout_session_id: str, payment_intent_id: str) -> PromoMessage:
        result = self.db.table("promo_payments").select("*").eq(
            "stripe_checkout_session_id", checkout_session_id).execute()
        if not result.data:
            raise PromoPaymentNotFoundError(checkout_session_id)
        payment = result.data[0]
        if payment["status"] == "completed":
            msg = self.db.table("promo_messages").select("*").eq("payment_id", payment["id"]).execute()
            if msg.data:
                return await self._map_message(msg.data[0])
        now = datetime.now(timezone.utc).isoformat()
        self.db.table("promo_payments").update({"status": "completed",
            "stripe_payment_intent_id": payment_intent_id, "completed_at": now}).eq("id", payment["id"]).execute()
        lp = await self.fetch_link_preview(payment["pending_link_url"]) if payment.get("pending_link_url") else None
        lp_dict = {"url": lp.url, "title": lp.title, "description": lp.description,
                   "image_url": lp.image_url, "site_name": lp.site_name} if lp else None
        msg_data = {"id": str(uuid4()), "user_id": payment["user_id"], "payment_id": payment["id"],
            "content": payment["pending_content"], "link_url": payment.get("pending_link_url"),
            "link_preview": lp_dict, "is_pinned": False,
            "reactions": {"fire": 0, "crown": 0, "heart": 0, "game": 0}, "created_at": now}
        self.db.table("promo_messages").insert(msg_data).execute()
        await self._increment_rate_limit(payment["user_id"])
        await self.recalculate_leaderboard()
        logger.info("Created promo message", extra={"user_id": payment["user_id"], "id": msg_data["id"]})
        return await self._map_message(msg_data)

    async def get_messages(self, cursor: Optional[str] = None, limit: int = 20) -> tuple[List[PromoMessage], Optional[str]]:
        query = self.db.table("promo_messages").select("*").is_("deleted_at", "null").order(
            "created_at", desc=True).limit(limit + 1)
        if cursor:
            cr = self.db.table("promo_messages").select("created_at").eq("id", cursor).execute()
            if cr.data:
                query = query.lt("created_at", cr.data[0]["created_at"])
        result = query.execute()
        messages, next_cursor = [], None
        if result.data:
            if len(result.data) > limit:
                next_cursor = result.data[limit - 1]["id"]
                result.data = result.data[:limit]
            messages = [await self._map_message(r) for r in result.data]
        return messages, next_cursor

    async def get_pinned_message(self) -> Optional[PromoMessage]:
        result = self.db.table("promo_messages").select("*").eq("is_pinned", True).is_("deleted_at", "null").execute()
        return await self._map_message(result.data[0]) if result.data else None

    async def delete_message(self, message_id: str, user_id: str) -> None:
        result = self.db.table("promo_messages").select("id, user_id").eq("id", message_id).is_("deleted_at", "null").execute()
        if not result.data:
            raise PromoMessageNotFoundError(message_id)
        if result.data[0]["user_id"] != user_id:
            raise PromoMessageNotOwnedError(message_id)
        self.db.table("promo_messages").update({"deleted_at": datetime.now(timezone.utc).isoformat(),
            "is_pinned": False}).eq("id", message_id).execute()
        logger.info("Deleted promo message", extra={"message_id": message_id, "user_id": user_id})

    async def get_leaderboard(self, user_id: Optional[str] = None) -> LeaderboardResponse:
        top = self.db.table("promo_leaderboard_cache").select(
            "user_id, total_donations_cents, message_count, rank, is_king").order("rank").limit(10).execute()
        top_10 = []
        for r in top.data or []:
            u = await self._get_user_info(r["user_id"])
            top_10.append(LeaderboardEntry(r["user_id"], u.get("display_name", "Unknown"), u.get("avatar_url"),
                r["total_donations_cents"], r["message_count"], r["rank"], r["is_king"]))
        user_entry = None
        if user_id:
            ur = self.db.table("promo_leaderboard_cache").select(
                "user_id, total_donations_cents, message_count, rank, is_king").eq("user_id", user_id).execute()
            if ur.data and ur.data[0]["rank"] > 10:
                r, u = ur.data[0], await self._get_user_info(user_id)
                user_entry = LeaderboardEntry(r["user_id"], u.get("display_name", "Unknown"), u.get("avatar_url"),
                    r["total_donations_cents"], r["message_count"], r["rank"], r["is_king"])
        return LeaderboardResponse(top_10=top_10, user_entry=user_entry)

    async def recalculate_leaderboard(self) -> None:
        try:
            self.db.rpc("recalculate_promo_leaderboard").execute()
            logger.info("Recalculated promo leaderboard")
        except Exception as e:
            logger.error(f"Failed to recalculate leaderboard: {e}")

    async def check_rate_limit(self, user_id: str) -> None:
        key = f"{self.RATE_LIMIT_KEY_PREFIX}{user_id}"
        count = await self.redis.get(key)
        if count and int(count) >= RATE_LIMIT_MAX:
            raise PromoRateLimitError(retry_after=max(await self.redis.ttl(key), 60))

    async def fetch_link_preview(self, url: str) -> Optional[LinkPreview]:
        cache_key = f"{self.LINK_PREVIEW_KEY_PREFIX}{url}"
        cached = await self.redis.get(cache_key)
        if cached:
            try:
                return LinkPreview(**json.loads(cached))
            except (json.JSONDecodeError, TypeError):
                pass
        try:
            async with aiohttp.ClientSession() as sess:
                async with sess.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    if resp.status != 200:
                        return None
                    preview = self._parse_og_tags(url, await resp.text())
                    if preview:
                        await self.redis.setex(cache_key, LINK_PREVIEW_CACHE_TTL, json.dumps({
                            "url": preview.url, "title": preview.title, "description": preview.description,
                            "image_url": preview.image_url, "site_name": preview.site_name}))
                    return preview
        except Exception as e:
            logger.warning(f"Failed to fetch link preview for {url}: {e}")
            return None

    async def _get_user_badges(self, user_id: str) -> UserBadges:
        result = self.db.table("promo_leaderboard_cache").select(
            "rank, is_king, total_donations_cents").eq("user_id", user_id).execute()
        if not result.data:
            return UserBadges()
        r = result.data[0]
        return UserBadges(r["is_king"], r["rank"] <= 10 if r["rank"] else False, r["rank"], r["total_donations_cents"])

    def _parse_og_tags(self, url: str, html: str) -> Optional[LinkPreview]:
        def get_meta(prop: str) -> Optional[str]:
            for pat in [rf'<meta[^>]+(?:property|name)=["\']og:{prop}["\'][^>]+content=["\']([^"\']+)["\']',
                        rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']og:{prop}["\']']:
                m = re.search(pat, html, re.IGNORECASE)
                if m:
                    return m.group(1)
            return None
        title = get_meta("title") or (m.group(1) if (m := re.search(r'<title>([^<]+)</title>', html, re.IGNORECASE)) else None)
        return LinkPreview(url, title, get_meta("description"), get_meta("image"), get_meta("site_name"))

    async def _get_user_info(self, user_id: str) -> Dict[str, Any]:
        result = self.db.table("users").select("display_name, avatar_url").eq("id", user_id).execute()
        return result.data[0] if result.data else {"display_name": "Unknown", "avatar_url": None}

    async def _map_message(self, row: Dict[str, Any]) -> PromoMessage:
        user_info, badges = await self._get_user_info(row["user_id"]), await self._get_user_badges(row["user_id"])
        lp = row.get("link_preview")
        link_preview = LinkPreview(lp.get("url", ""), lp.get("title"), lp.get("description"),
                                   lp.get("image_url"), lp.get("site_name")) if lp else None
        created_at = row["created_at"]
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        return PromoMessage(row["id"], row["user_id"], row["content"], row.get("link_url"), link_preview,
            row.get("is_pinned", False), row.get("reactions", {"fire": 0, "crown": 0, "heart": 0, "game": 0}),
            created_at, user_info.get("display_name", "Unknown"), user_info.get("avatar_url"), badges)

    async def _increment_rate_limit(self, user_id: str) -> None:
        key = f"{self.RATE_LIMIT_KEY_PREFIX}{user_id}"
        pipe = self.redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, RATE_LIMIT_WINDOW)
        await pipe.execute()


_promo_service: Optional[PromoService] = None


def get_promo_service() -> PromoService:
    global _promo_service
    if _promo_service is None:
        _promo_service = PromoService()
    return _promo_service


__all__ = ["PromoService", "PromoError", "PromoRateLimitError", "PromoMessageNotFoundError",
    "PromoMessageNotOwnedError", "PromoPaymentNotFoundError", "PromoMessage", "LeaderboardEntry",
    "LeaderboardResponse", "UserBadges", "LinkPreview", "get_promo_service",
    "PROMO_AMOUNT_CENTS", "RATE_LIMIT_MAX", "RATE_LIMIT_WINDOW"]
