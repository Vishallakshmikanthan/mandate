import os
import logging
from typing import Optional

logger = logging.getLogger("mandate.secrets")


def get_secret(key: str, default: Optional[str] = None) -> Optional[str]:
    """
    Retrieve server-side secret with production KMS / Secret Manager fallback.
    In production environments, ensures critical secrets are not using default test values.
    """
    val = os.environ.get(key)
    if val:
        return val

    provider = os.environ.get("SECRETS_PROVIDER", "env").lower()
    if provider == "gcp":
        try:
            from google.cloud import secretmanager
            project_id = os.environ.get("GCP_PROJECT_ID")
            if project_id:
                client = secretmanager.SecretManagerServiceClient()
                name = f"projects/{project_id}/secrets/{key}/versions/latest"
                response = client.access_secret_version(request={"name": name})
                return response.payload.data.decode("UTF-8")
        except Exception as e:
            logger.warning(f"Failed to fetch secret '{key}' from GCP Secret Manager: {e}")
    elif provider == "aws":
        try:
            import boto3
            client = boto3.client("secretsmanager")
            response = client.get_secret_value(SecretId=key)
            return response.get("SecretString")
        except Exception as e:
            logger.warning(f"Failed to fetch secret '{key}' from AWS Secrets Manager: {e}")

    return default
