from email_validator import EmailNotValidError, validate_email


def normalize_email(email: str) -> str:
    """Valida y normaliza un email a minúsculas y formato estándar.

    Lanza ValueError si el formato no es válido.
    """
    email = email.strip().lower()
    try:
        return validate_email(email, check_deliverability=False).normalized
    except EmailNotValidError as exc:
        raise ValueError("El formato del email no es válido") from exc
