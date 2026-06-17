from slowapi import Limiter
from slowapi.util import get_remote_address

# Limiter por IP — storage en memoria (suficiente para instancia única).
# En producción multi-instancia se migraría a Redis.
limiter = Limiter(key_func=get_remote_address)
