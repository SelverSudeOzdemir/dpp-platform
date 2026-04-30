"""
Webhook Event Service
Olay bildirimi — DPP değişikliklerini dış sistemlere ilet
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

import httpx

logger = logging.getLogger("webhook")


class WebhookEvent(str, Enum):
    DPP_CREATED       = "dpp.created"
    DPP_UPDATED       = "dpp.updated"
    DPP_STATUS_CHANGED = "dpp.status_changed"
    DPP_PUBLISHED     = "dpp.published"
    CERT_ADDED        = "certification.added"
    CERT_EXPIRED      = "certification.expired"


class WebhookService:
    """
    Webhook gönderimi.

    Kullanım:
        await WebhookService.send(
            url="https://erp.kocaer.com/webhooks/dpp",
            event=WebhookEvent.DPP_CREATED,
            payload={"dpp_id": str(dpp.id), ...},
            secret="webhook_secret_key",
        )
    """

    @staticmethod
    async def send(
        url: str,
        event: WebhookEvent,
        payload: dict[str, Any],
        *,
        secret: Optional[str] = None,
        timeout: float = 10.0,
        retry_count: int = 2,
    ) -> bool:
        """
        Webhook gönder.

        Args:
            url: Hedef URL
            event: Olay tipi
            payload: Gönderilecek veri
            secret: HMAC imzalama için gizli anahtar
            timeout: İstek timeout süresi
            retry_count: Başarısızlıkta kaç kez tekrar denensin

        Returns:
            True ise başarılı
        """
        body = WebhookService._build_body(event, payload)
        headers = WebhookService._build_headers(body, secret)

        for attempt in range(retry_count + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.post(url, json=body, headers=headers)

                if response.status_code < 300:
                    logger.info("Webhook gönderildi: event=%s url=%s", event, url)
                    return True

                logger.warning(
                    "Webhook başarısız: event=%s url=%s status=%d attempt=%d",
                    event, url, response.status_code, attempt + 1,
                )

            except Exception as e:
                logger.warning(
                    "Webhook hatası: event=%s url=%s hata=%s attempt=%d",
                    event, url, str(e), attempt + 1,
                )

        logger.error("Webhook tüm denemeler başarısız: event=%s url=%s", event, url)
        return False

    @staticmethod
    def _build_body(
        event: WebhookEvent,
        payload: dict[str, Any],
    ) -> dict:
        """Standart webhook body formatı."""
        return {
            "id": str(uuid.uuid4()),
            "event": event,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": payload,
        }

    @staticmethod
    def _build_headers(
        body: dict,
        secret: Optional[str],
    ) -> dict:
        """
        Webhook headers.
        Secret varsa HMAC-SHA256 imzası ekle.
        Alıcı taraf imzayı doğrulayarak isteğin bizden geldiğini anlar.
        """
        headers = {
            "Content-Type": "application/json",
            "X-DPP-Event": body["event"],
            "X-DPP-Delivery": body["id"],
        }

        if secret:
            body_str = json.dumps(body, default=str)
            signature = hmac.new(
                secret.encode(),
                body_str.encode(),
                hashlib.sha256,
            ).hexdigest()
            headers["X-DPP-Signature"] = f"sha256={signature}"

        return headers

    @staticmethod
    async def broadcast(
        urls: list[str],
        event: WebhookEvent,
        payload: dict[str, Any],
        secret: Optional[str] = None,
    ) -> dict[str, bool]:
        """
        Aynı olayı birden fazla URL'e gönder.

        Returns:
            {url: success} dict'i
        """
        import asyncio

        results = await asyncio.gather(*[
            WebhookService.send(url, event, payload, secret=secret)
            for url in urls
        ], return_exceptions=True)

        return {
            url: (result is True)
            for url, result in zip(urls, results)
        }