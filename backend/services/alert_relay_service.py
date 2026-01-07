"""
Alert Relay Service

Lightweight SSE relay for forwarding alert triggers to OBS browser sources.
Stateless design for horizontal scaling.

For multi-instance deployments, use Redis pub/sub instead of in-memory queues.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, Optional

from fastapi import Request

logger = logging.getLogger(__name__)

# In-memory connections (for single instance; use Redis pub/sub for multi-instance)
_connections: Dict[str, asyncio.Queue] = {}


class AlertRelayService:
    """Service for managing SSE connections and broadcasting triggers."""
    
    def __init__(self):
        self.connections = _connections
    
    async def connect(self, alert_id: str) -> asyncio.Queue:
        """
        Register a new SSE connection for an alert.
        
        Args:
            alert_id: The unique identifier of the alert
            
        Returns:
            asyncio.Queue: Queue for receiving events
        """
        queue: asyncio.Queue = asyncio.Queue()
        self.connections[alert_id] = queue
        logger.info(f"SSE connection opened for alert {alert_id}")
        return queue
    
    async def disconnect(self, alert_id: str) -> None:
        """
        Remove SSE connection.
        
        Args:
            alert_id: The unique identifier of the alert
        """
        if alert_id in self.connections:
            del self.connections[alert_id]
            logger.info(f"SSE connection closed for alert {alert_id}")
    
    def is_connected(self, alert_id: str) -> bool:
        """
        Check if an alert has an active connection.
        
        Args:
            alert_id: The unique identifier of the alert
            
        Returns:
            bool: True if connected, False otherwise
        """
        return alert_id in self.connections
    
    async def trigger(
        self,
        alert_id: str,
        event_type: str = "trigger",
        payload: Optional[Dict] = None,
    ) -> bool:
        """
        Send trigger event to connected alert.
        
        Args:
            alert_id: The unique identifier of the alert
            event_type: Type of event (trigger, test, config_update, ping)
            payload: Optional additional data to send
            
        Returns:
            bool: True if event was sent, False if no connection exists
        """
        if alert_id not in self.connections:
            logger.warning(f"No connection for alert {alert_id}")
            return False
        
        event = {
            "type": event_type,
            "alertId": alert_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": payload or {},
        }
        
        await self.connections[alert_id].put(event)
        logger.info(f"Trigger sent to alert {alert_id}: {event_type}")
        return True
    
    async def broadcast_ping(self) -> int:
        """
        Send ping to all connections (keepalive).
        
        Returns:
            int: Number of connections pinged
        """
        count = 0
        for alert_id, queue in self.connections.items():
            await queue.put({
                "type": "ping",
                "alertId": alert_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            count += 1
        return count
    
    def get_connection_count(self) -> int:
        """
        Get the number of active connections.
        
        Returns:
            int: Number of active connections
        """
        return len(self.connections)
    
    async def event_generator(
        self,
        alert_id: str,
        request: Request,
    ) -> AsyncGenerator[dict, None]:
        """
        Generate SSE events for a connection.
        
        Args:
            alert_id: The unique identifier of the alert
            request: FastAPI request object for disconnect detection
            
        Yields:
            dict: SSE event data with 'event' and 'data' keys
        """
        queue = await self.connect(alert_id)
        
        try:
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                
                try:
                    # Wait for event with timeout (for keepalive)
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield {
                        "event": event["type"],
                        "data": event,
                    }
                except asyncio.TimeoutError:
                    # Send keepalive ping
                    yield {
                        "event": "ping",
                        "data": {
                            "type": "ping",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        },
                    }
        finally:
            await self.disconnect(alert_id)


# Singleton instance
_relay_service: Optional[AlertRelayService] = None


def get_alert_relay_service() -> AlertRelayService:
    """
    Get or create the relay service singleton.
    
    Returns:
        AlertRelayService: The singleton relay service instance
    """
    global _relay_service
    if _relay_service is None:
        _relay_service = AlertRelayService()
    return _relay_service
