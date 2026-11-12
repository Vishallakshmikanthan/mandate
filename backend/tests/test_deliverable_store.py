import io
import zipfile
import pytest
from app.core.deliverable_store import (
    store_deliverable_file,
    inspect_deliverable,
    EICAR_TEST_STRING,
)
from app.models.counterparty import Counterparty
from app.models.mandate import Mandate
from app.models.intent import PaymentIntent
from app.models.escrow import Escrow
from app.models.audit import AuditLog
from app.schemas.escrow import EscrowState
from app.core.auth import create_session_token


def test_deliverable_store_and_sha256_inspection():
    data = b"# Design Deliverable\nHere are the 3 logo variants in vector format."
    filename = "deliverable_notes.md"

    sha256 = store_deliverable_file(data, filename)
    assert len(sha256) == 64

    inspection = inspect_deliverable(data, filename, "text/markdown")
    assert inspection.is_inspectable is True
    assert inspection.inspection_status == "INSPECTED"
    assert "Design Deliverable" in inspection.extracted_text
    assert inspection.sha256 == sha256


def test_zip_archive_manifest_inspection():
    # Build a zip archive in-memory containing SVG and PNG assets
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("README.md", "# Project Assets\nContains 3 vector SVGs and transparent PNGs.")
        z.writestr("logo_v1.svg", "<svg>logo 1</svg>")
        z.writestr("logo_v2.svg", "<svg>logo 2</svg>")
        z.writestr("logo_v3.svg", "<svg>logo 3</svg>")
    zip_bytes = buf.getvalue()

    inspection = inspect_deliverable(zip_bytes, "assets.zip", "application/zip")
    assert inspection.is_inspectable is True
    assert inspection.inspection_status == "INSPECTED"
    assert len(inspection.manifest) == 4
    assert "README.md" in inspection.extracted_text
    assert "logo_v1.svg" in inspection.extracted_text


def test_unsupported_binary_upload_yields_needs_human(client, db_session, sample_mandate):
    """
    Acceptance criterion: uploading an unsupported binary yields NEEDS_HUMAN;
    the verdict references the stored hash.
    """
    # 1. Setup verified counterparty, intent, and escrow in FUNDS_HELD
    cp = db_session.query(Counterparty).filter(Counterparty.handle == "seller_agent_acme").first()
    if not cp:
        cp = Counterparty(handle="seller_agent_acme", status="VERIFIED")
        db_session.add(cp)
        db_session.commit()

    intent = PaymentIntent(
        mandate_id=sample_mandate.id,
        amount_minor=5000,
        currency="USD",
        counterparty="seller_agent_acme",
        merchant_category="software_services",
        description="Binary build test task",
        decision="APPROVED"
    )
    db_session.add(intent)
    db_session.commit()

    escrow = Escrow(
        intent_id=intent.id,
        state=EscrowState.FUNDS_HELD.value,
        spec={"criteria": ["Build software binary"]},
        paypal_order_id="ORD-BIN-TEST",
        paypal_authorization_id="AUTH-BIN-TEST"
    )
    db_session.add(escrow)
    db_session.commit()

    # 2. Upload an unsupported binary file (.exe with Windows PE magic bytes b"MZ")
    binary_content = b"MZ\x90\x00\x03\x00\x00\x00" + (b"\x00" * 100) + b"UNSUPPORTED_EXE_PAYLOAD"
    files = {
        "file": ("malicious_payload.exe", io.BytesIO(binary_content), "application/x-msdownload")
    }

    upload_resp = client.post(f"/api/escrows/{escrow.id}/deliver-file", files=files)
    assert upload_resp.status_code == 200
    escrow_data = upload_resp.json()
    assert escrow_data["state"] == "DELIVERED"
    deliverable_record = escrow_data["deliverables"][0]
    assert deliverable_record["inspection_status"] == "UNSUPPORTED_BINARY"
    stored_sha256 = deliverable_record["sha256"]
    assert len(stored_sha256) == 64

    # 3. Trigger Arbitration
    arbitrate_resp = client.post(f"/api/escrows/{escrow.id}/arbitrate")
    assert arbitrate_resp.status_code == 200
    arb_data = arbitrate_resp.json()

    # Acceptance check: verdict is NEEDS_HUMAN and explanation references stored SHA-256 hash
    latest_verdict = arb_data["verdicts"][-1]
    assert latest_verdict["verdict"] == "NEEDS_HUMAN"
    assert stored_sha256 in latest_verdict["explanation"]

    # 4. Audit log check: verify DELIVERABLE_UPLOADED event contains stored sha256
    audit_entry = db_session.query(AuditLog).filter(AuditLog.event == "DELIVERABLE_UPLOADED").first()
    assert audit_entry is not None
    assert audit_entry.payload["sha256"] == stored_sha256


def test_virus_scan_hook_detects_malicious_file():
    """Verify extensible antivirus hook detects test virus payload and marks MALICIOUS."""
    malicious_data = EICAR_TEST_STRING + b"\nExtra benign filler content."
    inspection = inspect_deliverable(malicious_data, "invoice.pdf", "application/pdf")

    assert inspection.is_inspectable is False
    assert inspection.inspection_status == "MALICIOUS"
    assert "Malicious payload" in inspection.warning

