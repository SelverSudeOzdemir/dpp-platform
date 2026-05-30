"""
DB Base — Tüm modelleri içe aktarır, Alembic'in autogenerate kullanabilmesi için.
"""
from app.models.base import Base  # noqa: F401

# Tüm modelleri import et — Alembic metadata'ya kayıt olur
from app.models.company import Company  # noqa: F401
from app.models.manufacturer import Manufacturer, ManufacturerCertification, ProductionFacility  # noqa: F401
from app.models.product import ProductType, ChemicalComposition, MechanicalProperties  # noqa: F401
from app.models.dpp import DigitalProductPassport  # noqa: F401
from app.models.certification import Certification  # noqa: F401
from app.models.supply_chain import (  # noqa: F401
    SupplyChainOrganization,
    SupplyChainStage,
    SupplyChainMaterial,
    SupplyChainProcess,
)
from app.models.lifecycle import LifecycleEvent  # noqa: F401
from app.models.security import Stakeholder, DppAccessPolicy, ApiAccessLog  # noqa: F401
from app.models.user import User, ApiKey, AuditLog  # noqa: F401
from app.models.integration import RegistrySyncQueue, BackupSnapshot, DppChangelog  # noqa: F401
from app.models.ai_analysis import DppAiAnalysis  # noqa: F401