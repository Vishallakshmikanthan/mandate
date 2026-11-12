import pytest
from app.core.mandate_signing import canonicalize_policy, sign_policy, verify_mandate_signature

SECRET_KEY = "test_super_secure_secret_key_32_bytes_min!"


def test_canonical_json_sorting():
    # Order of keys in dictionary must not affect output canonical string
    dict1 = {"b": 2, "a": 1, "c": [3, 2]}
    dict2 = {"a": 1, "c": [3, 2], "b": 2}
    assert canonicalize_policy(dict1) == canonicalize_policy(dict2)
    assert canonicalize_policy(dict1) == '{"a":1,"b":2,"c":[3,2]}'


def test_sign_and_verify_success(sample_policy):
    sig = sign_policy(sample_policy, SECRET_KEY)
    assert isinstance(sig, str)
    assert len(sig) == 64  # SHA-256 hex digest length
    assert verify_mandate_signature(sample_policy, sig, SECRET_KEY) is True


def test_tampered_policy_fails_verification(sample_policy):
    sig = sign_policy(sample_policy, SECRET_KEY)

    # Adversary alters max_per_transaction_minor from 20000 to 90000
    tampered_policy = dict(sample_policy)
    tampered_policy["max_per_transaction_minor"] = 90000

    assert verify_mandate_signature(tampered_policy, sig, SECRET_KEY) is False


def test_wrong_key_fails_verification(sample_policy):
    sig = sign_policy(sample_policy, SECRET_KEY)
    assert verify_mandate_signature(sample_policy, sig, "wrong_secret_key") is False


def test_empty_signature_fails():
    assert verify_mandate_signature({"a": 1}, "", SECRET_KEY) is False
    assert verify_mandate_signature({"a": 1}, None, SECRET_KEY) is False


def test_app_env_prod_refuses_default_key():
    from app.config import Settings
    default_key = "mandate_super_secure_secret_signing_key_32_bytes_min!"

    # In prod with default key -> must raise ValueError
    with pytest.raises(ValueError, match="cannot be the default insecure key"):
        Settings(APP_ENV="prod", MANDATE_SIGNING_KEY=default_key)

    # In dev with short key -> must raise ValueError
    with pytest.raises(ValueError, match="must be at least 32 bytes long"):
        Settings(APP_ENV="dev", MANDATE_SIGNING_KEY="too_short_key")

    # In prod with secure 32+ byte key and PostgreSQL -> succeeds
    valid_key = "a" * 32
    s = Settings(
        APP_ENV="prod",
        MANDATE_SIGNING_KEY=valid_key,
        DATABASE_URL="postgresql://mandate:mandate@localhost:5432/mandate"
    )
    assert s.APP_ENV == "prod"
    assert s.MANDATE_SIGNING_KEY == valid_key

    # In prod with SQLite -> must raise ValueError
    with pytest.raises(ValueError, match="must be a PostgreSQL connection URL"):
        Settings(
            APP_ENV="prod",
            MANDATE_SIGNING_KEY=valid_key,
            DATABASE_URL="sqlite:///./mandate.db"
        )
