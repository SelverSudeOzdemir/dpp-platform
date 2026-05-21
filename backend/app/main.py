from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.api.v1.router import router

import app.models.security
import app.models.integration
import app.models.user
import app.models.company
import app.models.manufacturer
import app.models.product
import app.models.dpp
import app.models.supply_chain
import app.models.lifecycle
import app.models.certification

from app.models.base import Base
Base.registry.configure()

app = FastAPI(
    title="Kocaer DPP API",
    version="1.0.0",
    description="Digital Product Passport API - Kocaer Çelik",
)

import os

_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }

    for path, path_item in schema.get("paths", {}).items():
        for method, operation in path_item.items():
            if path in ["/api/v1/auth/login", "/api/v1/auth/refresh"]:
                continue
            operation["security"] = [{"BearerAuth": []}]

    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = custom_openapi