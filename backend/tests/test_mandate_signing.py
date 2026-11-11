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
