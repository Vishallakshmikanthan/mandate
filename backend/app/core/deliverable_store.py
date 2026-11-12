import os
import io
import zipfile
import hashlib
import logging
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

logger = logging.getLogger("mandate.deliverables")

MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB

# Prohibited executable binary extensions
PROHIBITED_BINARY_EXTENSIONS = {
    ".exe", ".dll", ".so", ".dylib", ".bin", ".elf", ".dmg", ".iso", ".sys", ".msi", ".com", ".scr"
}

# Known binary magic numbers
BINARY_MAGIC_HEADERS = [
    (b"MZ", "Windows PE executable (.exe/.dll)"),
    (b"\x7fELF", "Linux ELF executable"),
    (b"\xca\xfe\xba\xbe", "Mach-O / Java class binary"),
    (b"\xfe\xed\xfa\xce", "Mach-O binary (32-bit)"),
    (b"\xfe\xed\xfa\xcf", "Mach-O binary (64-bit)"),
]

# Standard EICAR test string for virus scan hook testing
EICAR_TEST_STRING = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"


class DeliverableInspection(BaseModel):
    sha256: str
    file_name: str
    file_size_bytes: int
    content_type: str
    is_inspectable: bool
    inspection_status: str  # "INSPECTED", "UNSUPPORTED_BINARY", "MALICIOUS"
    extracted_text: str
    manifest: Optional[List[Dict[str, Any]]] = None
    warning: Optional[str] = None


def get_deliverable_storage_dir() -> str:
    """Directory for storing deliverables by SHA-256."""
    d = os.environ.get("DELIVERABLE_STORAGE_DIR", os.path.join("data", "deliverables"))
    os.makedirs(d, exist_ok=True)
    return d


def run_virus_scan(data: bytes, filename: str) -> bool:
    """
    Extensible Antivirus Hook Point.
    Returns True if clean, False if virus / malicious payload detected.
    Hooks into ClamAV, VirusTotal, or enterprise scanner in production.
    """
    # 1. EICAR Test detection
    if EICAR_TEST_STRING in data:
        logger.warning("Antivirus Hook: EICAR test signature detected in %s!", filename)
        return False

    # Production hook extension point:
    # e.g., pyclamd or cloud provider scanner integration
    return True


def store_deliverable_file(data: bytes, filename: str) -> str:
    """
    Store file bytes under SHA-256 content-addressable storage path.
    Returns SHA-256 hexadecimal hash string.
    """
    sha256 = hashlib.sha256(data).hexdigest()
    storage_dir = get_deliverable_storage_dir()
    sub_dir = os.path.join(storage_dir, sha256[:2])
    os.makedirs(sub_dir, exist_ok=True)

    dest_path = os.path.join(sub_dir, sha256)
    if not os.path.exists(dest_path):
        with open(dest_path, "wb") as f:
            f.write(data)

    return sha256


def inspect_deliverable(
    data: bytes,
    filename: str,
    content_type: Optional[str] = None
) -> DeliverableInspection:
    """
    Inspect deliverable content:
    - Virus scanning hook
    - Size validation
    - Binary magic byte inspection
    - Text extraction
    - Zip manifest extraction and inspection
    """
    sha256 = hashlib.sha256(data).hexdigest()
    file_size = len(data)

    # 1. Size constraint
    if file_size > MAX_UPLOAD_SIZE_BYTES:
        raise ValueError(f"File size {file_size} exceeds maximum allowable limit of {MAX_UPLOAD_SIZE_BYTES} bytes.")

    # 2. Virus scan hook
    if not run_virus_scan(data, filename):
        return DeliverableInspection(
            sha256=sha256,
            file_name=filename,
            file_size_bytes=file_size,
            content_type=content_type or "application/octet-stream",
            is_inspectable=False,
            inspection_status="MALICIOUS",
            extracted_text="",
            warning="Malicious payload or test virus signature detected by security scanner."
        )

    _, ext = os.path.splitext(filename.lower())

    # 3. Check for unsupported binary files
    for magic, desc in BINARY_MAGIC_HEADERS:
        if data.startswith(magic):
            logger.info("Unsupported binary detected via magic header %s in %s", desc, filename)
            return DeliverableInspection(
                sha256=sha256,
                file_name=filename,
                file_size_bytes=file_size,
                content_type="application/octet-stream",
                is_inspectable=False,
                inspection_status="UNSUPPORTED_BINARY",
                extracted_text="",
                warning=f"Unsupported executable binary ({desc}) cannot be automatically verified."
            )

    if ext in PROHIBITED_BINARY_EXTENSIONS:
        return DeliverableInspection(
            sha256=sha256,
            file_name=filename,
            file_size_bytes=file_size,
            content_type="application/octet-stream",
            is_inspectable=False,
            inspection_status="UNSUPPORTED_BINARY",
            extracted_text="",
            warning=f"File extension '{ext}' is an unsupported binary executable format."
        )

    # 4. ZIP Archive Inspection
    if ext == ".zip" or (content_type and "zip" in content_type):
        try:
            with zipfile.ZipFile(io.BytesIO(data), "r") as z:
                manifest = []
                extracted_snippets = []
                has_forbidden_bin = False

                for info in z.infolist():
                    item_info = {
                        "filename": info.filename,
                        "file_size": info.file_size,
                        "is_dir": info.is_dir()
                    }
                    manifest.append(item_info)

                    # Check for nested binaries
                    _, nested_ext = os.path.splitext(info.filename.lower())
                    if nested_ext in PROHIBITED_BINARY_EXTENSIONS:
                        has_forbidden_bin = True

                    # Extract text snippets from readme or spec files
                    if not info.is_dir() and info.file_size < 100000:
                        if any(k in info.filename.lower() for k in ["readme", "spec", "manifest", ".txt", ".md", ".json"]):
                            try:
                                with z.open(info) as f:
                                    snippet = f.read().decode("utf-8", errors="replace")[:2000]
                                    extracted_snippets.append(f"[{info.filename}]\n{snippet}")
                            except Exception:
                                pass

                manifest_summary = f"Zip Archive ({len(manifest)} files):\n" + "\n".join(
                    f"- {m['filename']} ({m['file_size']} bytes)" for m in manifest[:20]
                )
                if len(manifest) > 20:
                    manifest_summary += f"\n... and {len(manifest) - 20} more files."

                full_text = manifest_summary + ("\n\nSample Contents:\n" + "\n\n".join(extracted_snippets) if extracted_snippets else "")

                if has_forbidden_bin:
                    return DeliverableInspection(
                        sha256=sha256,
                        file_name=filename,
                        file_size_bytes=file_size,
                        content_type="application/zip",
                        is_inspectable=False,
                        inspection_status="UNSUPPORTED_BINARY",
                        extracted_text=full_text,
                        manifest=manifest,
                        warning="Zip archive contains prohibited binary executable assets."
                    )

                return DeliverableInspection(
                    sha256=sha256,
                    file_name=filename,
                    file_size_bytes=file_size,
                    content_type="application/zip",
                    is_inspectable=True,
                    inspection_status="INSPECTED",
                    extracted_text=full_text,
                    manifest=manifest
                )
        except zipfile.BadZipFile:
            return DeliverableInspection(
                sha256=sha256,
                file_name=filename,
                file_size_bytes=file_size,
                content_type="application/zip",
                is_inspectable=False,
                inspection_status="UNSUPPORTED_BINARY",
                extracted_text="",
                warning="Corrupted or invalid zip archive."
            )

    # 5. Text / Code / SVG / JSON
    text_content = ""
    is_text = False
    if ext in {".txt", ".md", ".json", ".csv", ".py", ".ts", ".js", ".html", ".svg", ".xml"}:
        is_text = True
    elif content_type and any(t in content_type for t in ["text", "json", "xml", "svg"]):
        is_text = True

    if is_text:
        try:
            text_content = data.decode("utf-8", errors="replace")[:32000]
            return DeliverableInspection(
                sha256=sha256,
                file_name=filename,
                file_size_bytes=file_size,
                content_type=content_type or "text/plain",
                is_inspectable=True,
                inspection_status="INSPECTED",
                extracted_text=text_content
            )
        except Exception:
            pass

    # 6. Image formats (PNG, JPEG, WebP)
    if ext in {".png", ".jpg", ".jpeg", ".webp"} or (content_type and "image" in content_type):
        summary = f"Image Asset: {filename} ({file_size} bytes, type: {content_type or ext[1:]})"
        return DeliverableInspection(
            sha256=sha256,
            file_name=filename,
            file_size_bytes=file_size,
            content_type=content_type or "image/png",
            is_inspectable=True,
            inspection_status="INSPECTED",
            extracted_text=summary
        )

    # Fallback: unsupported binary format
    return DeliverableInspection(
        sha256=sha256,
        file_name=filename,
        file_size_bytes=file_size,
        content_type=content_type or "application/octet-stream",
        is_inspectable=False,
        inspection_status="UNSUPPORTED_BINARY",
        extracted_text="",
        warning=f"Unknown or unsupported binary file format ('{ext}')."
    )
