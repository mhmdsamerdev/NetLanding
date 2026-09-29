import os
import tempfile

# database.py reads these at import time
os.environ["NETLANDING_DATA_DIR"] = tempfile.mkdtemp(prefix="netlanding-test-")
os.environ.pop("NETLANDING_DB_URL", None)
