import os
import sys
from pathlib import Path
from datetime import datetime, timezone
import sqlalchemy
from sqlalchemy.orm import Session

# Add backend directory to path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.models.user import User
from app.core.auth import hash_password

def seed_db(db_url: str):
    print(f"Seeding users for: {db_url.split('@')[-1] if '@' in db_url else db_url}")
    engine = sqlalchemy.create_engine(db_url)
    with Session(engine) as session:
        # Check supervisor
        sup = session.query(User).filter(User.email == "supervisor@mandate.demo").first()
        if not sup:
            sup = User(
                id="usr_demo_supervisor_001",
                email="supervisor@mandate.demo",
                password_hash=hash_password("Mandate2026!"),
                full_name="Demo Supervisor",
                role="ADMIN",
                is_active=True,
                created_at=datetime.now(timezone.utc)
            )
            session.add(sup)
        else:
            sup.password_hash = hash_password("Mandate2026!")
            sup.role = "ADMIN"
            sup.is_active = True

        # Check admin
        adm = session.query(User).filter(User.email == "admin@mandate.dev").first()
        if not adm:
            adm = User(
                id="usr_admin_001",
                email="admin@mandate.dev",
                password_hash=hash_password("SecureAdminPassword123!"),
                full_name="Admin User",
                role="ADMIN",
                is_active=True,
                created_at=datetime.now(timezone.utc)
            )
            session.add(adm)
        else:
            adm.password_hash = hash_password("SecureAdminPassword123!")
            adm.role = "ADMIN"
            adm.is_active = True

        session.commit()
        print("Seeded successfully!")

if __name__ == "__main__":
    db_url = os.getenv("DATABASE_URL", "sqlite:///./mandate.db")
    seed_db(db_url)

